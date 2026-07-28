// greenp-unshipped-sync: 그린ERP의 "미출고현황 리스트(invtNoOutStatListPop.php)" 화면과
// 100% 동일한 원본 데이터를 가져와 Supabase(greenp_unshipped)에 그대로 반영합니다.
//
// [배경] 기존에는 greenp_joborder_detail(작업 완료분)과 greenp_outbound(출고 기록)를 우리 쪽에서
// product_name 등으로 대조해 "미출고"를 재구성(추정)했습니다. 그런데 이 방식은 (1) 두 테이블의
// 동기화 완결성에 전적으로 의존하고, (2) product_name 매칭 자체가 근사치라서, 그린ERP 화면과
// 100% 일치를 수학적으로 보장할 수 없었습니다(사용자 보고: 실제 화면보다 훨씬 많은 651건이 표시됨).
//
// 실제 그린ERP 화면(invtNoOutStatListPop.php)에서 브라우저 네트워크 요청을 직접 캡처해 원본 API를
// 확인했습니다:
//   1) 업체 등록번호 조회: POST /greenp/common/commonCompAction.php
//      params: submitType=select, sort_field="", sort_asc="", mid=1001, uid=5, sh_value=<업체명>
//      응답의 data[].mcomser 가 "등록번호"입니다(예: (주)대한강재 -> "433").
//   2) 미출고현황 리스트 조회: POST /greenp/invt/invtNoOutStatListAction.php
//      params: submitType=select, sort_field="", sort_asc="", mid=1001, uid=5,
//              sh_value_icomp=<업체명>, sh_value1=<등록번호>
//      이 조합으로만 정상적으로 데이터가 나옵니다(등록번호 없이 업체명만 보내면 항상 빈 배열).
//      응답 필드: idate/mdate(생산일자), mjunp/ijunp(작업전표번호), spum(품명), sspec(규격),
//      sweightw(원중량), idesc(작업SIZE), iqty(수량).
//
// 이 함수는 재구성이 아니라 그린ERP가 직접 계산한 값을 그대로 가져오므로, 원본과의 불일치 가능성이
// 근본적으로 없습니다(단, 조회 시점 사이의 시차만큼은 항상 존재 — "현재 시점 기준" 스냅샷이기 때문).
//
// 안전장치: 다른 엔드포인트(출고 등)에서 발견됐던 "totalRecord는 정확한데 data 배열만 잘리는" 잘림
// 버그가 이 엔드포인트에도 있을 가능성에 대비해, totalRecord와 실제 수신 건수를 비교해 부족하면
// 최대 2회 재시도합니다(날짜 필터가 없는 스냅샷이라 날짜분할은 적용 불가 — 재시도만 적용).
//
// 호출: GET/POST (파라미터 없음, 항상 전체 거래처 대상 전체 재동기화)

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

async function fetchActionWithMeta(cookie: string, path: string, params: Record<string, string>): Promise<{ data: any[]; totalRecord: number }> {
  const res = await fetch(`${GREENP_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json();
  if (json.result_cd !== "OK") throw new Error(`${path} 실패: ${json.message}`);
  const data = json.data || [];
  const totalRecord = parseInt(String(json.totalRecord ?? data.length), 10);
  return { data, totalRecord: isNaN(totalRecord) ? data.length : totalRecord };
}

async function fetchActionWithRetry(cookie: string, path: string, params: Record<string, string>, retries = 2): Promise<{ data: any[]; totalRecord: number }> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await fetchActionWithMeta(cookie, path, params);
      if (result.data.length >= result.totalRecord) return result;
      lastErr = new Error(`잘림 감지: totalRecord=${result.totalRecord}, received=${result.data.length}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < retries) await new Promise((r) => setTimeout(r, 700 * (i + 1)));
  }
  throw lastErr;
}

// 업체명으로 그린ERP 내부 "등록번호"(mcomser)를 조회합니다. 미출고현황 리스트 API는
// 업체명만으로는 데이터를 주지 않고, 반드시 이 등록번호를 함께 보내야 합니다.
async function fetchCompanyCode(cookie: string, companyName: string): Promise<string | null> {
  const { data } = await fetchActionWithRetry(cookie, "/greenp/common/commonCompAction.php", {
    submitType: "select", sort_field: "", sort_asc: "", mid: "1001", uid: "5", sh_value: companyName,
  }, 1);
  const exact = data.find((r: any) => r.mcomp === companyName);
  const picked = exact || data[0];
  return picked ? String(picked.mcomser ?? "") || null : null;
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

Deno.serve(async (_req) => {
  const runStartedAt = new Date(Date.now() - 5000).toISOString();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const result: Record<string, any> = {};

  try {
    const cookie = await greenpLogin();
    result.loginOk = true;

    const { data: companyRows, error: compErr } = await supabase.from("greenp_customers").select("name");
    if (compErr) throw new Error("거래처 목록 조회 실패: " + compErr.message);
    const companyNames = (companyRows || []).map((c: any) => c.name).filter(Boolean);
    result.companiesTotal = companyNames.length;

    const succeededCompanies: string[] = [];
    const failedCompanies: string[] = [];
    let insertedTotal = 0;

    for (const companyName of companyNames) {
      try {
        const code = await fetchCompanyCode(cookie, companyName);
        if (!code) { failedCompanies.push(companyName); continue; }

        const { data: rows } = await fetchActionWithRetry(cookie, "/greenp/invt/invtNoOutStatListAction.php", {
          submitType: "select", sort_field: "", sort_asc: "", mid: "1001", uid: "5",
          sh_value_icomp: companyName, sh_value1: code,
        });

        const insertRows = rows.map((r: any) => ({
          company_name: companyName,
          company_code: code,
          production_date: toDateOrNull(r.mdate ?? r.idate),
          job_slip_no: r.mjunp ? String(r.mjunp) : (r.ijunp ? String(r.ijunp) : null),
          product_name: r.spum ?? null,
          spec: r.sspec ?? null,
          original_weight: toNum(r.sweightw),
          description: r.idesc ?? null,
          qty: r.iqty ? String(r.iqty) : null,
        }));

        if (insertRows.length > 0) {
          const { error } = await supabase.from("greenp_unshipped").insert(insertRows);
          if (error) throw new Error("greenp_unshipped insert 실패: " + error.message);
          insertedTotal += insertRows.length;
        }
        succeededCompanies.push(companyName);
      } catch (e) {
        failedCompanies.push(companyName + ": " + String((e as Error)?.message || e));
      }
    }

    // 이번 실행에서 성공적으로 새로 가져온 거래처에 한해서만, 이전 스냅샷(과거 synced_at)을 정리합니다.
    // 실패한 거래처의 과거 데이터는 다음 실행 때까지 그대로 남겨 "일시적 오류로 데이터가 사라지는" 것을 방지합니다.
    if (succeededCompanies.length > 0) {
      await supabase.from("greenp_unshipped")
        .delete()
        .in("company_name", succeededCompanies)
        .lt("synced_at", runStartedAt);
    }

    result.companiesSucceeded = succeededCompanies.length;
    result.companiesFailed = failedCompanies.length;
    if (failedCompanies.length > 0) result.failedDetail = failedCompanies.slice(0, 15);
    result.insertedTotal = insertedTotal;

    await supabase.from("greenp_sync_logs").insert({
      target_table: "greenp_unshipped",
      record_count: insertedTotal,
      status: failedCompanies.length > 0 ? "부분성공" : "성공",
    });

    result.ok = true;
    return new Response(JSON.stringify(result, null, 1), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    try {
      await supabase.from("greenp_sync_logs").insert({ target_table: "greenp-unshipped-sync", record_count: 0, status: "실패" });
    } catch (_e) { /* ignore */ }
    result.ok = false;
    result.error = String((err as Error)?.message || err);
    return new Response(JSON.stringify(result, null, 1), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
