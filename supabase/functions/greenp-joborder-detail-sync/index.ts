// greenp-joborder-detail-sync: 그린피(greenpweb.co.kr) 작업지시서의 "상세" 정보
// (품명/규격/길이/원중량/사용중량/단가/금액/가공규칙)를 서버측(Edge Function)에서
// 자동 로그인 후 가져와 Supabase(greenp_joborder_detail)에 반영합니다.
//
// 이 상세 정보는 osungProdJoborderListAction.php(요약 목록, 이미 greenp_joborders에 동기화 중)에는
// 없고, 그리드의 "다운로드" 버튼이 호출하는 osungProdJoborderUpdateAction.php(submitType=excel)를
// 통해서만 얻을 수 있습니다(엑셀 바이너리 응답). 이 함수는 그 요청을 서버에서 그대로 재현하고,
// 받은 엑셀을 파싱해 구조화된 데이터로 저장합니다.
//
// 로그인은 greenp-sync-v2와 동일한 방식(RSA 공개키 발급 -> AES-256-CBC(zero IV, hex) 암호화
// -> RSA(PKCS1v1.5)로 AES키 암호화 -> /greenp/pmem/login_do.php)을 재현합니다.
// GREENP_USER / GREENP_PASS 는 Supabase Edge Function Secrets 로만 저장되어 있으며
// 이 코드에는 평문 자격증명이 없습니다.
//
// 호출 방법:
//   GET/POST ?mode=hourly                  -> 오늘 하루치 작업지시서 상세만 재동기화 (기본값)
//   GET/POST ?mode=backfill&fr=YYYY-MM-DD&to=YYYY-MM-DD -> 지정 기간 전체 백필
//   GET/POST ?mode=custom&fr=YYYY-MM-DD&to=YYYY-MM-DD
//
// v5: greenp_joborder_detail 업서트 성공 후, 같은 상세 데이터를 ERP2.0의 sales_records(매출원장)에도
// 함께 upsert합니다. greenp_joborder_no를 자연키로 사용해 중복 없이 갱신되며,
// 담당자/연락처 같은 사람이 직접 입력하는 필드는 건드리지 않습니다.
//
// v6: [버그 수정] joborder_no(mjunp)는 greenp_outbound의 outbound_no와 마찬가지로 전체 기간에서
// 유일하지 않고 날짜별로 초기화되는 일련번호임. 조회 기간이 넓어지면(예: 2주 이상) 같은 joborder_no가
// 서로 다른 날짜에 반복 등장해 sales_records upsert 시 "ON CONFLICT DO UPDATE command cannot affect
// row a second time" 오류가 발생함(실측: 2026-07-01~07-15 백필에서 재현, joborderListCount=221에서 실패).
// 배치 내에서 greenp_joborder_no 기준으로 먼저 중복 제거(같은 키면 더 나중 날짜 것으로 덮어씀)한 뒤
// upsert하도록 수정.

import forge from "npm:node-forge@1.3.1";
import * as XLSX from "npm:xlsx@0.18.5";
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

async function fetchJoborderList(cookie: string, dateFr: string, dateTo: string): Promise<any[]> {
  const res = await fetch(`${GREENP_BASE}/greenp/prod/osung/osungProdJoborderListAction.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({
      submitType: "select",
      sort_field: "",
      sort_asc: "",
      mid: "1001",
      uid: "5",
      sh_date_fr: dateFr,
      sh_date_to: dateTo,
      sh_value: "",
      sh_value2: "",
      gubunChk1: "y",
      gubunChk2: "y",
      gubunChk3: "y",
    }).toString(),
  });
  const json = await res.json();
  if (json.result_cd !== "OK") throw new Error("작업지시서 목록 조회 실패: " + json.message);
  return json.data || [];
}

// 다운로드 버튼(fn_downloadBtn)이 호출하는 것과 동일한 요청.
// submitType=excel 이면 JSON이 아니라 엑셀(xls) 바이너리가 그대로 응답됩니다.
async function fetchJoborderExcel(
  cookie: string,
  mjunpVal: string,
  mdateVal: string,
  mgubunVal: string,
  dateFr: string,
  dateTo: string,
): Promise<ArrayBuffer> {
  const url = `${GREENP_BASE}/greenp/prod/osung/osungProdJoborderUpdateAction.php?&mjunpVal=${encodeURIComponent(mjunpVal)}&mdateVal=${encodeURIComponent(mdateVal)}&mgubunVal=${encodeURIComponent(mgubunVal)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({
      submitType: "excel",
      sort_field: "",
      sort_asc: "",
      mid: "1001",
      uid: "5",
      sh_date_fr: dateFr,
      sh_date_to: dateTo,
      sh_value: "",
      sh_value2: "",
      gubunChk1: "y",
      gubunChk2: "y",
      gubunChk3: "y",
    }).toString(),
  });
  if (!res.ok) throw new Error(`엑셀 다운로드 실패 (mjunp=${mjunpVal}): HTTP ${res.status}`);
  return await res.arrayBuffer();
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// 엑셀 1행짜리(헤더+데이터 1줄) 응답을 헤더 이름 기준으로 파싱합니다.
// 실제 관측된 헤더: 입고일자,업체명,작업구분,품명,규격,길이,원중량,사용중량,단가,금액,가공규칙
function parseJoborderExcel(buf: ArrayBuffer): Record<string, any> | null {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return null;
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  if (rows.length < 2) return null;
  const header = rows[0].map((h: any) => String(h ?? "").trim());
  const dataRow = rows[1];
  const rec: Record<string, any> = {};
  header.forEach((h, i) => { rec[h] = dataRow[i]; });
  return rec;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "hourly";
  const today = new Date().toISOString().slice(0, 10);
  let dateFr: string;
  let dateTo: string;

  if (mode === "backfill" || mode === "custom") {
    dateFr = url.searchParams.get("fr") || today;
    dateTo = url.searchParams.get("to") || today;
  } else {
    // hourly: 오늘 하루치만 (상세 데이터는 그날 작업 대상만 필요)
    dateFr = today;
    dateTo = today;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const result: Record<string, any> = { mode, dateFr, dateTo };

  try {
    const cookie = await greenpLogin();
    result.loginOk = true;

    const jobList = await fetchJoborderList(cookie, dateFr, dateTo);
    result.joborderListCount = jobList.length;

    const detailRows: any[] = [];
    const errors: string[] = [];

    for (const row of jobList) {
      const mjunp = String(row.mjunp ?? "");
      const mdate = String(row.mdate ?? "").slice(0, 10);
      const mgubun = String(row.mgubun ?? "");
      if (!mjunp || !mdate || !mgubun) continue;

      try {
        const buf = await fetchJoborderExcel(cookie, mjunp, mdate, mgubun, dateFr, dateTo);
        const rec = parseJoborderExcel(buf);
        if (!rec) { errors.push(`mjunp=${mjunp}: 엑셀 파싱 결과 없음`); continue; }

        detailRows.push({
          joborder_no: mjunp,
          joborder_date: mdate,
          work_type: mgubun,
          company_name: rec["업체명"] ?? null,
          product_name: rec["품명"] != null ? String(rec["품명"]) : null,
          spec: rec["규격"] ?? null,
          length_val: rec["길이"] != null ? String(rec["길이"]) : null,
          original_weight: toNum(rec["원중량"]),
          used_weight: toNum(rec["사용중량"]),
          unit_price: toNum(rec["단가"]),
          amount: toNum(rec["금액"]),
          process_rule: rec["가공규칙"] != null ? String(rec["가공규칙"]) : null,
        });
      } catch (e) {
        errors.push(`mjunp=${mjunp}: ${(e as Error).message}`);
      }
    }

    if (detailRows.length > 0) {
      const { error } = await supabase
        .from("greenp_joborder_detail")
        .upsert(detailRows, { onConflict: "joborder_no,joborder_date,work_type" });
      if (error) throw new Error("greenp_joborder_detail upsert 실패: " + error.message);
    }

    // ---------- ERP2.0 sales_records(매출원장) 동기화 (v5) ----------
    // 같은 상세 데이터를 이용해 sales_records에도 반영. greenp_joborder_no를 자연키로 쓰므로
    // 같은 작업지시서를 다시 동기화해도 중복 생성되지 않고 갱신만 됩니다.
    //
    // v6: joborder_no(mjunp)는 날짜별로 초기화되는 일련번호라 넓은 기간을 한번에 조회하면 같은
    // joborder_no가 여러 날짜에 걸쳐 중복 등장할 수 있음. sales_records의 UNIQUE 키는
    // greenp_joborder_no 하나뿐이라, 같은 배치 안에 중복 키가 있으면 upsert가
    // "ON CONFLICT DO UPDATE command cannot affect row a second time" 오류로 실패함.
    // 배치 내 중복은 더 나중(최근) joborder_date를 가진 것으로 덮어써서 하나만 남깁니다.
    const salesRecordMap = new Map<string, {
      work_date: string; customer_name: string | null; management_no: string; greenp_joborder_no: string;
      weight: number; unit_price: number; total_price: number; work_type: string; remarks: string | null;
    }>();
    for (const d of detailRows) {
      if (!d.joborder_date || d.amount == null) continue;
      const key = d.joborder_no;
      const existing = salesRecordMap.get(key);
      if (existing && existing.work_date > d.joborder_date) continue; // 이미 더 최신 날짜 것이 있으면 유지
      salesRecordMap.set(key, {
        work_date: d.joborder_date,
        customer_name: d.company_name,
        management_no: d.joborder_no,
        greenp_joborder_no: d.joborder_no,
        weight: d.used_weight ?? d.original_weight ?? 0,
        unit_price: d.unit_price ?? 0,
        total_price: d.amount ?? 0,
        work_type: d.work_type,
        remarks: d.spec ? `규격 ${d.spec}` : null,
      });
    }
    const salesRecordRows = [...salesRecordMap.values()];

    let salesSyncedCount = 0;
    if (salesRecordRows.length > 0) {
      const { error } = await supabase
        .from("sales_records")
        .upsert(salesRecordRows, { onConflict: "greenp_joborder_no" });
      if (error) throw new Error("sales_records upsert 실패: " + error.message);
      salesSyncedCount = salesRecordRows.length;
    }
    result.salesRecordsSynced = salesSyncedCount;

    result.detailCount = detailRows.length;
    result.errorCount = errors.length;
    if (errors.length > 0) result.errors = errors.slice(0, 10);

    await supabase.from("greenp_sync_logs").insert([
      { target_table: "greenp_joborder_detail", record_count: detailRows.length, status: errors.length > 0 ? "부분성공" : "성공" },
    ]);

    result.ok = true;
    return new Response(JSON.stringify(result, null, 1), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    try {
      await supabase.from("greenp_sync_logs").insert({
        target_table: "greenp-joborder-detail-sync",
        record_count: 0,
        status: "실패",
      });
    } catch (_) { /* ignore logging failure */ }
    result.ok = false;
    result.error = String((err as Error)?.message || err);
    return new Response(JSON.stringify(result, null, 1), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
