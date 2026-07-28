// greenp-sync-v2: 그린피(greenpweb.co.kr) 상품입고/출고/재고 실데이터를
// 서버측(Edge Function) 자동 로그인 후 가져와 Supabase에 반영합니다.
//
// 로그인은 그린피 웹의 실제 클라이언트 로직(RSA 공개키 발급 -> AES-256-CBC(zero IV, hex)
// 암호화 -> RSA(PKCS1v1.5)로 AES키 암호화 -> /greenp/pmem/login_do.php 로 전송)을
// 그대로 서버에서 재현합니다. GREENP_USER / GREENP_PASS 는 Supabase Edge Function
// Secrets 로만 저장되어 있으며 이 코드에는 평문 자격증명이 없습니다.
//
// 호출 방법:
//   GET/POST ?mode=backfill                -> 기본 최근 3개월 ~ 오늘 백필 (fr 파라미터로 조정 가능)
//   GET/POST ?mode=hourly                  -> 최근 3일치만 재동기화 (재고/미수금은 항상 전체 스냅샷)
//   GET/POST ?mode=custom&fr=YYYY-MM-DD&to=YYYY-MM-DD
//
// 대상 테이블: greenp_inbound(입고), greenp_outbound(출고), greenp_inventory(재고 스냅샷),
//   greenp_joborders(작업지시서), greenp_production(생산전표/가공비), greenp_receivables(미수금 스냅샷)
//
// v6: greenp_inbound.length_m("길이" 필드)를 숫자(toNum)가 아닌 원본 텍스트로 저장하도록 수정.
// 그린ERP 원본 mmeter 필드는 실제 미터값보다 "기보"/"대창" 같은 창고(입고처) 구분 문자열이
// 들어있는 경우가 많아, 숫자로 강제 변환하면 이 값이 0으로 유실되었음(greenp_inbound.length_m 컬럼도 text로 변경됨).
//
// v7에서 출고(outbound) 원본 API 응답을 직접 확인한 결과, 그린ERP의
// outJunpPumListAction.php 응답에는 길이/창고구분 유사 필드가 전혀 존재하지 않음을 확인함
// (mid, mdate, mjunp, mcomp, mcomser, spum, sspec, sweightw, sdesc, sqty, jakupdate, jakupjunp 가 전부).
// 따라서 greenp_outbound에는 length_m을 추가하지 않음(원본 데이터 자체가 없음).
//
// v9: 그린ERP를 정식 데이터 원장(source of truth)으로 쓰기로 하면서, 동기화 중 오류가 나도
// 기존 데이터가 사라지지 않도록 모든 테이블에서 "삭제 후 삽입" -> "삽입 후, 이번 실행 이전(runStartedAt
// 기준, 5초 여유)의 오래된 행만 삭제"로 순서를 바꿈. 삽입이 실패해서 catch로 빠지면 삭제가 아예
// 실행되지 않으므로, 그린ERP 쪽 응답이 비정상이거나 네트워크가 끊겨도 직전 성공분이 유지됨.
// 신규 행은 삽입 시 synced_at/created_at이 자동으로 now()가 되므로 runStartedAt보다 항상 이후이고,
// 방금 삽입한 신규 행이 실수로 함께 삭제되는 일은 없음.
//
// v10: 그린ERP 원장 데이터를 이용해 ERP2.0 자체 테이블(companies/receivables/shipments)도
// 함께 자동 동기화. 자연키(name/customer_name/shipment_no)에 UNIQUE 제약을 추가해 upsert로
// 처리하며, 사람이 입력한 담당자·연락처·연체일수·메모 등 커스텀 필드는 건드리지 않음.
//
// v11: shipments upsert 오류 수정. outboundRows는 품목(라인) 단위라 하나의 출고전표(mjunp)에
// 여러 줄이 있을 수 있어, 집계 없이 그대로 upsert하면 같은 배치 안에 동일한 shipment_no가 중복되어
// "ON CONFLICT DO UPDATE command cannot affect row a second time" 오류가 발생함. outbound_no 기준으로
// 중량을 합산해 전표 단위로 집계한 뒤 upsert하도록 수정.
//
// v12: outbound_no(mjunp)가 전체 기간에서 유일하지 않고 날짜별로 초기화되는 일련번호임을 확인
// (실측: outbound_no=1~6이 300일 넘게 매일 반복 등장). v11에서 outbound_no만으로 집계하면 서로 다른
// 날짜의 전표가 합쳐져 shipments 중량이 실제보다 부풀려지는 오류가 있었음. (outbound_date, outbound_no)
// 복합키로 집계/upsert하도록 수정하고, shipments 테이블의 UNIQUE 제약도 (shipment_no, shipment_date)
// 복합키로 변경함.
//
// v13: [중대 버그 수정] outJunpPumListAction.php(출고 조회)를 거래처 필터(sh_value) 없이 호출하면,
// 응답의 totalRecord는 실제 매칭 건수(예: 353)를 정확히 보고하지만 "data" 배열은 항상 최근 3건으로만
// 잘려서 옴을 실측으로 확인함(그린ERP 서버 자체의 동작 — currPage/totalPage도 1/1로 나와 정상 응답처럼
// 보이지만 실제로는 대부분의 행이 유실됨). 반면 sh_value에 거래처명을 지정해서 단일 거래처로 조회하면
// 해당 거래처의 출고 내역 전체가 정상적으로 옴을 확인함. 그래서 출고 조회는 더 이상 전체 거래처를
// 한번에 조회하지 않고, companies 테이블의 거래처 목록을 순회하며 거래처별로 조회해 합치는 방식으로
// 변경함(로그인은 이 함수 실행당 1회만 하고, 이후 같은 로그인 쿠키로 거래처 수만큼 반복 요청).
// 이 버그로 인해 v12까지는 greenp_outbound가 실제보다 크게 축소된 상태로 동기화되고 있었음
// (예: 대한강재 최근 1주일 출고가 14건 있었는데 3건으로 덮어써짐). 거래처별 조회는 요청 수가 늘어나
// 시간이 더 걸리므로, 거래처가 아주 많아지면 fetchOutboundForAllCompanies의 동시 처리 수(CONCURRENCY)를
// 조정할 수 있게 함.
//
// v14: [중대 버그 수정 #2] 거래처 필터(sh_value)를 지정해도, 해당 거래처의 조회 기간 내 매칭 건수가
// 많을 때(정확한 임계치는 불명 — 실측: 대한강재 2026-05-01~05-31 전체 조회 시 totalRecord는 정확히
// "246"으로 보고되지만 실제 응답 body의 data 배열은 24건에서 끊김) 서버 응답이 중간에서 잘리는
// 별개의 버그가 있음을 추가로 확인함. 이 잘림은 조회 기간 크기에 단순 비례하지 않아(예: 15일 조회가
// 31일 조회보다 더 많은 바이트를 반환한 사례도 있어, 고정 청크 크기로는 안전하게 회피 불가) 고정된
// 날짜 청크 크기로는 근본 해결이 안 됨. 그래서 매 응답마다 함께 내려오는 totalRecord와 실제
// data.length를 비교해 잘림을 감지하고, 잘렸으면 요청한 날짜 구간을 절반으로 쪼개 재귀적으로
// (최대 하루 단위까지) 다시 조회해 합치는 방식(fetchOutboundForCompanyWindow)으로 변경함.
// 하루 단위까지 쪼개도 여전히 totalRecord와 안 맞으면(극히 드묾) 그 이상은 포기하고 받은 만큼만 반환.
//
// v15: "그린ERP↔ERP2.0 동기화 문제점분석" 문서(6.2/6.3절)에 따른 확대 적용.
// (1) 전수조사 결과 출고 조회만 잘림이 있었지만, 데이터가 누적되면 다른 목록 조회(입고/작업지시서
// 목록/생산전표)도 같은 임계치에 도달할 수 있어 동일한 totalRecord 검증 + 날짜구간 재귀분할을
// fetchDateRangeSplit()로 일반화해 세 곳 모두에 적용함(이 세 엔드포인트는 거래처 필터가 없어 회사별
// 순회 없이 날짜 구간만 쪼갬).
// (2) 재고/미수금(invtListAction/accountDepositStatListAction)은 날짜·거래처 필터 자체가 없는 전체
// 스냅샷이라 쪼갤 축이 없음 — 대신 fetchActionWithRetry로 최소 1회 재시도는 보장하고, totalRecord와
// 실제 수신 건수가 다르면 result에 명시적으로 플래그(inventoryComplete/receivablesComplete)를 남겨
// 잘림이 재발해도 로그로 바로 드러나도록 함.
// (3) 재귀 분할 중 개별 요청이 네트워크 오류 등으로 실패하면 기존에는 바로 포기하고 빈 배열을
// 반환했음 — fetchActionWithRetry로 짧은 대기 후 최대 2회 재시도를 먼저 시도하도록 바꿔, 일시적
// 오류로 인한 데이터 누락 가능성을 줄임.

import forge from "npm:node-forge@1.3.1";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GREENP_BASE = "http://greenpweb.co.kr";

function parseSetCookie(headers: Headers): string {
  const raw = headers.get("set-cookie");
  if (!raw) return "";
  return raw.split(/,(?=[^ ]+=)/).map((c) => c.split(";")[0]).join("; ");
}

function makeRandomKey(len: number): string {
  const map = "abcdefghijklmnopqrstuvwxyz0123456789~!@#%^&*()_+';,./";
  let key = "";
  for (let i = 0; i < len; i++) key += map.charAt(Math.floor(Math.random() * map.length));
  return key;
}

async function aesEncryptHex(plaintext: string, keyStr: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(keyStr);
  const iv = new Uint8Array(16);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, enc.encode(plaintext));
  const bytes = new Uint8Array(ciphertext);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function greenpLogin(): Promise<string> {
  const user = Deno.env.get("GREENP_USER") || "";
  const pass = Deno.env.get("GREENP_PASS") || "";
  if (!user || !pass) throw new Error("GREENP_USER / GREENP_PASS 시크릿이 설정되어 있지 않습니다.");

  const keyRes = await fetch(`${GREENP_BASE}/greenp/pmem/login_do.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ submitType: "create_key" }).toString(),
  });
  const keyCookie = parseSetCookie(keyRes.headers);
  const keyJson = await keyRes.json();
  if (keyJson.result_cd !== "OK") throw new Error("RSA 키 발급 실패: " + keyJson.message);
  const publicKeyPem = keyJson.public_key as string;

  const paramString = `----------------<userid>${user}</userid><userpw>${pass}</userpw>`;
  const cryptKey = makeRandomKey(32);
  const reqDataHex = await aesEncryptHex(paramString, cryptKey);

  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const encryptedBytes = publicKey.encrypt(cryptKey, "RSAES-PKCS1-V1_5");
  const cryptKeyEncB64 = forge.util.encode64(encryptedBytes);

  const loginRes = await fetch(`${GREENP_BASE}/greenp/pmem/login_do.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(keyCookie ? { Cookie: keyCookie } : {}),
    },
    body: new URLSearchParams({
      submitType: "login",
      req_data: reqDataHex,
      crypt_key_enc: cryptKeyEncB64,
      saveid_yn: "N",
    }).toString(),
  });
  const loginCookie = parseSetCookie(loginRes.headers);
  const loginJson = await loginRes.json();
  if (loginJson.result_cd !== "OK") throw new Error("로그인 실패: " + loginJson.message);

  return [keyCookie, loginCookie].filter(Boolean).join("; ");
}

async function fetchAction(cookie: string, path: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${GREENP_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
    },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json();
  if (json.result_cd !== "OK") throw new Error(`${path} 실패: ${json.message}`);
  return json.data || [];
}

// v14: totalRecord까지 함께 반환하는 버전 — 응답이 중간에서 잘렸는지(data.length < totalRecord)
// 판단하는 데 사용합니다.
async function fetchActionWithMeta(cookie: string, path: string, params: Record<string, string>): Promise<{ data: any[]; totalRecord: number }> {
  const res = await fetch(`${GREENP_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
    },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json();
  if (json.result_cd !== "OK") throw new Error(`${path} 실패: ${json.message}`);
  const data = json.data || [];
  const totalRecord = parseInt(String(json.totalRecord ?? data.length), 10);
  return { data, totalRecord: isNaN(totalRecord) ? data.length : totalRecord };
}

// v15: 네트워크 순간 오류 등으로 요청이 실패하면 짧은 대기 후 최대 retries회 재시도합니다.
// 재귀 날짜분할 도중 개별 leaf 요청이 조용히 실패해 데이터가 누락되는 것을 줄이기 위함입니다.
async function fetchActionWithRetry(cookie: string, path: string, params: Record<string, string>, retries = 2): Promise<{ data: any[]; totalRecord: number }> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchActionWithMeta(cookie, path, params);
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw lastErr;
}

function toNum(v: any): number {
  const n = parseFloat(String(v ?? "0").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function toDateOrNull(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

// mmeter/imeter는 숫자(실제 길이)일 수도, 창고구분 텍스트(예: 기보/대창)일 수도 있으므로 원본 그대로 보존
function toTextOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetweenStr(fr: string, to: string): number {
  const a = new Date(fr + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

// v14: 거래처 하나에 대해 [dateFr, dateTo] 구간을 조회하고, totalRecord보다 실제로 받은 행 수가
// 적으면(서버측 응답 잘림) 구간을 절반으로 쪼개 재귀 조회해 합칩니다. 하루 단위까지 쪼개도 여전히
// 못 맞추면(매우 드묾) 그 이상은 포기하고 받은 만큼만 반환합니다. 그린ERP 서버에 과도한 동시
// 요청을 보내지 않도록 순차적으로 처리합니다.
async function fetchOutboundForCompanyWindow(
  cookie: string,
  companyName: string,
  dateFr: string,
  dateTo: string,
  depth = 0,
): Promise<any[]> {
  try {
    const { data, totalRecord } = await fetchActionWithRetry(cookie, "/greenp/out/outJunpPumListAction.php", {
      submitType: "select",
      sort_field: "",
      sort_asc: "",
      mid: "1001",
      uid: "5",
      sh_date_fr: dateFr,
      sh_date_to: dateTo,
      sh_value: companyName,
      sh_value2: "",
    });
    if (data.length >= totalRecord || dateFr === dateTo || depth > 20) {
      return data;
    }
    const span = daysBetweenStr(dateFr, dateTo);
    const leftTo = addDaysStr(dateFr, Math.floor(span / 2));
    const rightFr = addDaysStr(leftTo, 1);
    const left = await fetchOutboundForCompanyWindow(cookie, companyName, dateFr, leftTo, depth + 1);
    const right = await fetchOutboundForCompanyWindow(cookie, companyName, rightFr, dateTo, depth + 1);
    return [...left, ...right];
  } catch (_e) {
    return [];
  }
}

// v15: 거래처 필터가 없는 목록 조회(입고/작업지시서목록/생산전표)용 범용 날짜분할 재조회 헬퍼.
// 회사별 순회 없이 날짜 구간만 totalRecord 기준으로 재귀 분할합니다. 3절 전수조사에서 이 세 엔드포인트는
// 현재 데이터량에서 잘림이 없음을 확인했지만, 데이터가 누적되면 출고와 같은 문제가 재발할 수 있어
// 예방적으로 동일한 방어 로직을 적용합니다.
async function fetchDateRangeSplit(
  cookie: string,
  path: string,
  baseParams: Record<string, string>,
  dateFr: string,
  dateTo: string,
  depth = 0,
): Promise<any[]> {
  try {
    const { data, totalRecord } = await fetchActionWithRetry(cookie, path, {
      ...baseParams,
      sh_date_fr: dateFr,
      sh_date_to: dateTo,
    });
    if (data.length >= totalRecord || dateFr === dateTo || depth > 20) {
      return data;
    }
    const span = daysBetweenStr(dateFr, dateTo);
    const leftTo = addDaysStr(dateFr, Math.floor(span / 2));
    const rightFr = addDaysStr(leftTo, 1);
    const left = await fetchDateRangeSplit(cookie, path, baseParams, dateFr, leftTo, depth + 1);
    const right = await fetchDateRangeSplit(cookie, path, baseParams, rightFr, dateTo, depth + 1);
    return [...left, ...right];
  } catch (_e) {
    return [];
  }
}

// v13: 출고 조회는 거래처(sh_value)를 비워두면 서버가 최근 3건으로 응답을 잘라버리는 버그가 있어,
// 거래처별로 순회하며 조회합니다. v14부터는 각 거래처 조회 자체도 totalRecord 기반으로 잘림을
// 감지해 필요할 때만 날짜 구간을 쪼개 재조회합니다(fetchOutboundForCompanyWindow). 순차 호출(하나씩)로
// 그린ERP 서버에 과도한 동시 요청을 보내지 않습니다.
async function fetchOutboundForAllCompanies(
  cookie: string,
  dateFr: string,
  dateTo: string,
  companyNames: string[],
): Promise<any[]> {
  const all: any[] = [];
  for (const cname of companyNames) {
    if (!cname) continue;
    const rows = await fetchOutboundForCompanyWindow(cookie, cname, dateFr, dateTo);
    if (rows.length > 0) all.push(...rows);
  }
  return all;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "hourly";
  let dateFr: string;
  let dateTo: string;
  const today = new Date().toISOString().slice(0, 10);

  // 이번 실행이 시작된 시각(5초 여유를 둠) — 이 시각 이전에 들어온 행만 "오래된 행"으로 간주해 삭제 대상으로 삼음.
  // 방금 이번 실행에서 삽입한 행은 synced_at/created_at이 이 시각 이후이므로 삭제 대상에서 자동으로 제외됨.
  const runStartedAt = new Date(Date.now() - 5000).toISOString();

  if (mode === "backfill") {
    if (url.searchParams.get("fr")) {
      dateFr = url.searchParams.get("fr")!;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 90); // 기본 최근 3개월
      dateFr = d.toISOString().slice(0, 10);
    }
    dateTo = url.searchParams.get("to") || today;
  } else if (mode === "custom") {
    dateFr = url.searchParams.get("fr") || today;
    dateTo = url.searchParams.get("to") || today;
  } else {
    // hourly: 최근 3일 (수정/역기재 반영 버퍼)
    const d = new Date();
    d.setDate(d.getDate() - 3);
    dateFr = d.toISOString().slice(0, 10);
    dateTo = today;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const result: Record<string, any> = { mode, dateFr, dateTo };

  try {
    const cookie = await greenpLogin();
    result.loginOk = true;

    // ---------- 상품입고 ----------
    // v15: fetchDateRangeSplit으로 totalRecord 검증 + 필요시 날짜분할 재조회 적용(예방적 조치).
    const inboundRaw = await fetchDateRangeSplit(cookie, "/greenp/ibgo/ibgoJunpListAction.php", {
      submitType: "select",
      sort_field: "",
      sort_asc: "",
      mid: "1001",
      uid: "5",
      selectMjunp: "",
    }, dateFr, dateTo);
    const inboundRows = inboundRaw.map((r: any) => ({
      inbound_no: String(r.mjunp ?? ""),
      inbound_date: toDateOrNull(r.mdate),
      slip_no: String(r.mcnt ?? ""),
      company_name: r.mcomp ?? null,
      company_code: r.mcomser ?? null,
      product_name: r.mpum ?? null,
      spec: r.mspec ?? null,
      weight: toNum(r.mweightw),
      length_m: toTextOrNull(r.mmeter),
    })).filter((r: any) => r.inbound_date);

    if (inboundRows.length > 0) {
      const { error } = await supabase.from("greenp_inbound").insert(inboundRows);
      if (error) throw new Error("greenp_inbound insert 실패: " + error.message);
    }
    await supabase.from("greenp_inbound").delete()
      .gte("inbound_date", dateFr).lte("inbound_date", dateTo)
      .lt("synced_at", runStartedAt);
    result.inboundCount = inboundRows.length;

    // ---------- 출고 (품목단위) ----------
    // v13/v14: 거래처(sh_value) 없이 조회하면 서버가 응답을 3건으로 잘라버리는 버그, 그리고
    // 거래처를 지정해도 매칭 건수가 많으면 응답이 중간에서 잘리는 버그(위 주석 참고)가 있어,
    // companies 테이블의 거래처 목록을 순회하며 거래처별로, 필요하면 날짜 구간까지 쪼개 조회합니다.
    const { data: companyRowsForOutbound } = await supabase.from("companies").select("name");
    const companyNamesForOutbound = (companyRowsForOutbound || []).map((c: any) => c.name).filter(Boolean);
    const outboundRaw = await fetchOutboundForAllCompanies(cookie, dateFr, dateTo, companyNamesForOutbound);
    const outboundRows = outboundRaw.map((r: any) => ({
      outbound_no: String(r.mjunp ?? ""),
      outbound_date: toDateOrNull(r.mdate),
      company_name: r.mcomp ?? null,
      company_code: r.mcomser ?? null,
      product_name: r.spum ?? null,
      spec: r.sspec ?? null,
      weight: toNum(r.sweightw),
      description: r.sdesc ?? null,
      qty: r.sqty ? String(r.sqty) : null,
      work_date: toDateOrNull(r.jakupdate),
      work_slip_no: r.jakupjunp ? String(r.jakupjunp) : null,
    })).filter((r: any) => r.outbound_date);

    if (outboundRows.length > 0) {
      const { error } = await supabase.from("greenp_outbound").insert(outboundRows);
      if (error) throw new Error("greenp_outbound insert 실패: " + error.message);
    }
    await supabase.from("greenp_outbound").delete()
      .gte("outbound_date", dateFr).lte("outbound_date", dateTo)
      .lt("synced_at", runStartedAt);
    result.outboundCount = outboundRows.length;
    result.outboundCompaniesQueried = companyNamesForOutbound.length;

    // ---------- 재고 (전체 스냅샷) ----------
    // v15: 재고/미수금은 날짜·거래처 필터 자체가 없는 전체 스냅샷이라 재귀분할할 축이 없음.
    // 대신 fetchActionWithRetry로 순간 오류 재시도는 보장하고, totalRecord와 실제 수신 건수가
    // 다르면 result.inventoryComplete=false로 표시해 잘림이 재발해도 로그에서 바로 드러나게 함.
    const invtMeta = await fetchActionWithRetry(cookie, "/greenp/invt/invtListAction.php", {
      submitType: "select",
      sort_field: "",
      sort_asc: "",
      sortChecked: "",
      mid: "1001",
      uid: "5",
      sh_value_icomp: "",
      sh_value1: "",
      sh_value2: "",
      sh_value3: "",
    });
    const invtRaw = invtMeta.data;
    result.inventoryTotalRecord = invtMeta.totalRecord;
    result.inventoryComplete = invtRaw.length >= invtMeta.totalRecord;
    const invtRows = invtRaw.map((r: any) => ({
      product_code: r.icode ?? null,
      customer_name: r.icomp ?? "",
      company_code: r.icomser ?? null,
      product_name: r.ipum ?? null,
      spec: r.ispec ?? null,
      original_weight: toNum(r.iweight),
      changed_weight: toNum(r.ichgweight),
      remaining_weight: toNum(r.iweightw),
      received_date: toDateOrNull(r.idate),
      length_m: r.imeter ? toNum(r.imeter) : null,
      memo: r.ibigo || null,
    }));

    if (invtRows.length > 0) {
      const { error } = await supabase.from("greenp_inventory").insert(invtRows);
      if (error) throw new Error("greenp_inventory insert 실패: " + error.message);
    }
    // greenp_inventory에는 synced_at 컬럼이 없어 created_at(삽입 시 자동 now())을 대신 사용
    await supabase.from("greenp_inventory").delete().lt("created_at", runStartedAt);
    result.inventoryCount = invtRows.length;

    // ---------- 작업지시서(오성) ----------
    // v15: fetchDateRangeSplit으로 totalRecord 검증 + 필요시 날짜분할 재조회 적용(예방적 조치).
    const jobRaw = await fetchDateRangeSplit(cookie, "/greenp/prod/osung/osungProdJoborderListAction.php", {
      submitType: "select",
      sort_field: "",
      sort_asc: "",
      mid: "1001",
      uid: "5",
      sh_value: "",
      sh_value2: "",
      gubunChk1: "y",
      gubunChk2: "y",
      gubunChk3: "y",
    }, dateFr, dateTo);
    const jobRows = jobRaw.map((r: any) => ({
      joborder_no: String(r.mjunp ?? ""),
      joborder_date: toDateOrNull(r.mdate),
      company_name: r.mcomp ?? null,
      company_code: r.mcomser ?? null,
      priority: r.mrank ?? null,
      status: r.mstate ?? null,
      status_code: r.mstatecd ?? null,
      work_type: r.mgubun ?? null,
      memo: r.mbigo || null,
      prod_date: toDateOrNull(r.mproddate),
      prod_slip_no: r.mprodjunp ? String(r.mprodjunp) : null,
    })).filter((r: any) => r.joborder_date);

    if (jobRows.length > 0) {
      const { error } = await supabase.from("greenp_joborders").insert(jobRows);
      if (error) throw new Error("greenp_joborders insert 실패: " + error.message);
    }
    await supabase.from("greenp_joborders").delete()
      .gte("joborder_date", dateFr).lte("joborder_date", dateTo)
      .lt("synced_at", runStartedAt);
    result.joborderCount = jobRows.length;

    // ---------- 생산전표(오성, 가공비 포함) ----------
    // v15: fetchDateRangeSplit으로 totalRecord 검증 + 필요시 날짜분할 재조회 적용(예방적 조치).
    const prodRaw = await fetchDateRangeSplit(cookie, "/greenp/prod/prodJunpListAction.php", {
      submitType: "select",
      sort_field: "",
      sort_asc: "",
      mid: "1001",
      uid: "5",
      sh_value: "",
      sh_value2: "",
      sh_sale_yn: "",
    }, dateFr, dateTo);
    const prodRows = prodRaw.map((r: any) => ({
      slip_no: String(r.mjunp ?? ""),
      slip_date: toDateOrNull(r.mdate),
      company_name: r.mcomp ?? null,
      company_code: r.mcomser ?? null,
      amount: toNum(r.mgum),
      work_type: r.mgubun ?? null,
      memo: r.mmemo || null,
      qty: r.mqty ? String(r.mqty) : null,
      outsourcing_company: r.mwicomp || null,
    })).filter((r: any) => r.slip_date);

    if (prodRows.length > 0) {
      const { error } = await supabase.from("greenp_production").insert(prodRows);
      if (error) throw new Error("greenp_production insert 실패: " + error.message);
    }
    await supabase.from("greenp_production").delete()
      .gte("slip_date", dateFr).lte("slip_date", dateTo)
      .lt("synced_at", runStartedAt);
    result.productionCount = prodRows.length;

    // ---------- 미수금 현황 (전체 스냅샷) ----------
    // v15: 재고와 동일하게 재귀분할 축이 없어 재시도 + 완결성 플래그만 적용.
    const recvMeta = await fetchActionWithRetry(cookie, "/greenp/account/accountDepositStatListAction.php", {
      submitType: "select",
      sort_field: "",
      sort_asc: "",
      mid: "1001",
      uid: "5",
      sh_value: "",
      sh_value1: "",
    });
    const recvRaw = recvMeta.data;
    result.receivablesTotalRecord = recvMeta.totalRecord;
    result.receivablesComplete = recvRaw.length >= recvMeta.totalRecord;
    const recvRows = recvRaw.map((r: any) => ({
      company_name: r.mcomp ?? "",
      company_code: r.mcomser ?? null,
      amount: toNum(r.mhmisu),
    })).filter((r: any) => r.company_name);

    if (recvRows.length > 0) {
      const { error } = await supabase.from("greenp_receivables").insert(recvRows);
      if (error) throw new Error("greenp_receivables insert 실패: " + error.message);
    }
    await supabase.from("greenp_receivables").delete().lt("synced_at", runStartedAt);
    result.receivablesCount = recvRows.length;

    // ---------- ERP2.0 자체 테이블 동기화 (v10) ----------
    // 그린ERP를 데이터 원장으로 채택하면서, 위에서 이미 가져온 데이터를 그대로 이용해
    // ERP2.0 자체 화면(거래처 마스터/미수금/출고)도 함께 최신 상태로 맞춥니다.
    // 사람이 직접 입력한 필드(담당자·연락처·연체일수·메모 등)는 절대 덮어쓰지 않습니다.

    // 1) 거래처 마스터 — 없는 거래처만 새로 추가. 출고·작업지시·생산전표에 나오면 매출처,
    //    입고에만 나오면(원자재 공급처) 매입처로 추정해 넣습니다. 기존 거래처는 건드리지 않음.
    const allCompanyNames = new Set<string>();
    [...inboundRows, ...outboundRows, ...jobRows, ...prodRows].forEach((r: any) => { if (r.company_name) allCompanyNames.add(r.company_name); });
    invtRows.forEach((r: any) => { if (r.customer_name) allCompanyNames.add(r.customer_name); });
    recvRows.forEach((r: any) => { if (r.company_name) allCompanyNames.add(r.company_name); });

    const outNames = new Set<string>();
    [...outboundRows, ...jobRows, ...prodRows].forEach((r: any) => { if (r.company_name) outNames.add(r.company_name); });

    const { data: existingCompanies } = await supabase.from("companies").select("name");
    const existingNames = new Set((existingCompanies || []).map((c: any) => c.name));
    const newCompanyRows = [...allCompanyNames]
      .filter((n) => n && !existingNames.has(n))
      .map((name) => ({ name, type: outNames.has(name) ? "매출처" : "매입처" }));
    if (newCompanyRows.length > 0) {
      const { error } = await supabase.from("companies").upsert(newCompanyRows, { onConflict: "name", ignoreDuplicates: true });
      if (error) throw new Error("companies insert 실패: " + error.message);
    }
    result.newCompanies = newCompanyRows.length;

    // 2) 미수금 — amount만 갱신, overdue_days/note는 보존. 그린ERP에서 사라진(완납) 거래처는
    //    삭제하지 않고 amount만 0으로 처리해 이력(연체일수·메모)을 남겨둡니다.
    const recvUpsertRows = recvRows.map((r: any) => ({ customer_name: r.company_name, amount: r.amount, updated_at: new Date().toISOString() }));
    if (recvUpsertRows.length > 0) {
      const { error } = await supabase.from("receivables").upsert(recvUpsertRows, { onConflict: "customer_name" });
      if (error) throw new Error("receivables upsert 실패: " + error.message);
    }
    const recvNameSet = new Set(recvRows.map((r: any) => r.company_name));
    const { data: existingRecv } = await supabase.from("receivables").select("customer_name").neq("amount", 0);
    const staleRecvNames = (existingRecv || []).map((r: any) => r.customer_name).filter((n: string) => !recvNameSet.has(n));
    if (staleRecvNames.length > 0) {
      await supabase.from("receivables").update({ amount: 0, updated_at: new Date().toISOString() }).in("customer_name", staleRecvNames);
    }
    result.receivablesSynced = recvUpsertRows.length;

    // 3) 출고 — shipments를 그린ERP 출고(greenp_outbound)와 동일하게 유지.
    //    outboundRows는 품목(라인) 단위라 하나의 출고전표(mjunp)에 여러 줄이 있을 수 있음 —
    //    shipments는 전표 단위 테이블이므로 outbound_no 기준으로 중량을 합산해 한 줄로 집계한 뒤 upsert.
    //    주의: outbound_no(mjunp)는 전체 기간에서 유일한 값이 아니라 날짜별로 초기화되는
    //    일련번호임(예: 매일 1,2,3... 부터 다시 시작). 따라서 outbound_no만으로 집계/키를 잡으면
    //    서로 다른 날짜의 다른 전표가 같은 번호로 합쳐지는 오류가 발생함(실측: outbound_no=1~6이
    //    300일 넘게 반복 등장). 반드시 (outbound_date, outbound_no) 복합키로 집계해야 하며,
    //    shipments 테이블의 UNIQUE 제약도 (shipment_no, shipment_date) 복합키로 걸려 있음.
    const shipmentAgg = new Map<string, { shipment_no: string; customer_name: string | null; weight: number; shipment_date: string | null }>();
    for (const r of outboundRows as any[]) {
      if (!r.outbound_no || !r.outbound_date) continue;
      const key = `${r.outbound_date}|${r.outbound_no}`;
      const existing = shipmentAgg.get(key);
      if (existing) {
        existing.weight += r.weight || 0;
      } else {
        shipmentAgg.set(key, {
          shipment_no: r.outbound_no,
          customer_name: r.company_name,
          weight: r.weight || 0,
          shipment_date: r.outbound_date,
        });
      }
    }
    const shipmentRows = [...shipmentAgg.values()];
    if (shipmentRows.length > 0) {
      const { error } = await supabase.from("shipments").upsert(shipmentRows, { onConflict: "shipment_no,shipment_date" });
      if (error) throw new Error("shipments upsert 실패: " + error.message);
    }
    result.shipmentsSynced = shipmentRows.length;

    // backfill 모드에서는 조회 기간(dateFr) 이전의 과거 데이터를 정리해
    // "최근 N개월치"만 유지되도록 합니다. (예: 이전에 더 넓은 기간으로 백필했던 잔여 데이터 정리)
    // 이 단계는 위의 삽입들이 전부 성공적으로 끝난 뒤에만 실행되므로 안전합니다.
    if (mode === "backfill") {
      await supabase.from("greenp_inbound").delete().lt("inbound_date", dateFr);
      await supabase.from("greenp_outbound").delete().lt("outbound_date", dateFr);
      await supabase.from("greenp_joborders").delete().lt("joborder_date", dateFr);
      await supabase.from("greenp_production").delete().lt("slip_date", dateFr);
      result.trimmedToWindow = true;
    }

    await supabase.from("greenp_sync_logs").insert([
      { target_table: "greenp_inbound", record_count: inboundRows.length, status: "성공" },
      { target_table: "greenp_outbound", record_count: outboundRows.length, status: "성공" },
      { target_table: "greenp_inventory", record_count: invtRows.length, status: "성공" },
      { target_table: "greenp_joborders", record_count: jobRows.length, status: "성공" },
      { target_table: "greenp_production", record_count: prodRows.length, status: "성공" },
      { target_table: "greenp_receivables", record_count: recvRows.length, status: "성공" },
    ]);

    result.ok = true;
    return new Response(JSON.stringify(result, null, 1), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    // 여기로 빠졌다는 것은 어느 한 테이블의 삽입(또는 로그인/조회)이 실패했다는 뜻이며,
    // 이 경우 해당 테이블 이후 단계는 실행되지 않았고, 이미 삽입된 테이블도 "삭제"는
    // 각자 자기 삽입이 성공한 뒤에만 실행되므로 기존 데이터가 남아있습니다.
    await supabase.from("greenp_sync_logs").insert({
      target_table: "greenp-sync-v2",
      record_count: 0,
      status: "실패",
    });
    result.ok = false;
    result.error = String((err as Error)?.message || err);
    return new Response(JSON.stringify(result, null, 1), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
