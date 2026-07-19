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
