// greenp-joborders-refresh (2026-10-14 신규)
// 그린ERP 작업지시서 미러(greenp_joborders)는 greenp-sync-v2(hourly)가 "최근 3일"만 다시 읽기 때문에,
// 작업지시일이 4일 넘게 지난 작업지시서는 상태(완료 여부)·삭제가 미러에 반영되지 않았다.
// (예: 10/08 작업지시서 21건이 10/12 이후 상태가 멈춤) → 대시보드 이월 판단이 옛 상태로 계속 이뤄짐.
// 이 함수는 [오늘-REFRESH_DAYS, 오늘-4] 구간의 작업지시서만 다시 읽어 미러를 갱신한다.
//   - 응답 잘림(totalRecord > 받은 건수)이면 날짜 구간을 반으로 나눠 다시 조회.
//   - 조회가 하나라도 실패하면 아무것도 지우지 않고 종료(기존 미러 유지).
//   - 삽입 성공 후에만, 이번 실행 이전에 들어온 같은 구간의 옛 행을 지운다(greenp-sync-v2와 같은 방식).
// 호출: GET/POST ?days=30 (기본 30), ?dry=true 이면 조회만.
import forge from "npm:node-forge@1.3.1";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GREENP_BASE = "http://greenpweb.co.kr";
const PATH = "/greenp/prod/osung/osungProdJoborderListAction.php";

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
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(keyStr), { name: "AES-CBC" }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv: new Uint8Array(16) }, cryptoKey, enc.encode(plaintext)));
  let hex = "";
  for (const b of ct) hex += b.toString(16).padStart(2, "0");
  return hex;
}
async function greenpLogin(): Promise<string> {
  const user = Deno.env.get("GREENP_USER") || "";
  const pass = Deno.env.get("GREENP_PASS") || "";
  if (!user || !pass) throw new Error("GREENP_USER / GREENP_PASS 시크릿이 설정되어 있지 않습니다.");
  const keyRes = await fetch(`${GREENP_BASE}/greenp/pmem/login_do.php`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ submitType: "create_key" }).toString(),
  });
  const keyCookie = parseSetCookie(keyRes.headers);
  const keyJson = await keyRes.json();
  if (keyJson.result_cd !== "OK") throw new Error("RSA 키 발급 실패: " + keyJson.message);
  const cryptKey = makeRandomKey(32);
  const reqDataHex = await aesEncryptHex(`----------------<userid>${user}</userid><userpw>${pass}</userpw>`, cryptKey);
  const publicKey = forge.pki.publicKeyFromPem(keyJson.public_key as string);
  const cryptKeyEncB64 = forge.util.encode64(publicKey.encrypt(cryptKey, "RSAES-PKCS1-V1_5"));
  const loginRes = await fetch(`${GREENP_BASE}/greenp/pmem/login_do.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...(keyCookie ? { Cookie: keyCookie } : {}) },
    body: new URLSearchParams({ submitType: "login", req_data: reqDataHex, crypt_key_enc: cryptKeyEncB64, saveid_yn: "N" }).toString(),
  });
  const loginCookie = parseSetCookie(loginRes.headers);
  const loginJson = await loginRes.json();
  if (loginJson.result_cd !== "OK") throw new Error("로그인 실패: " + loginJson.message);
  return [keyCookie, loginCookie].filter(Boolean).join("; ");
}
function addDays(d: string, n: number): string {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);
}
function todayKST(): string {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}
function toDateOrNull(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}
async function fetchPage(cookie: string, fr: string, to: string): Promise<{ data: any[]; total: number }> {
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${GREENP_BASE}${PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
        body: new URLSearchParams({
          submitType: "select", sort_field: "", sort_asc: "", mid: "1001", uid: "5", sh_value: "", sh_value2: "",
          gubunChk1: "y", gubunChk2: "y", gubunChk3: "y", sh_date_fr: fr, sh_date_to: to,
        }).toString(),
      });
      const json = await res.json();
      if (json.result_cd !== "OK") throw new Error(`목록 조회 실패: ${json.message}`);
      const data = json.data || [];
      const total = parseInt(String(json.totalRecord ?? data.length), 10);
      return { data, total: isNaN(total) ? data.length : total };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw lastErr; // 실패는 그대로 던짐 — 호출 쪽에서 삭제 단계까지 가지 않게
}
async function fetchRange(cookie: string, fr: string, to: string, depth = 0): Promise<any[]> {
  const { data, total } = await fetchPage(cookie, fr, to);
  if (data.length >= total) return data;
  if (fr === to || depth > 20) throw new Error(`응답 잘림 해결 불가: ${fr}~${to} (${data.length}/${total})`);
  const mid = addDays(fr, Math.floor(daysBetween(fr, to) / 2));
  return [...await fetchRange(cookie, fr, mid, depth + 1), ...await fetchRange(cookie, addDays(mid, 1), to, depth + 1)];
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const days = Math.min(60, Math.max(5, parseInt(url.searchParams.get("days") || "30", 10) || 30));
  const dry = url.searchParams.get("dry") === "true";
  const today = todayKST();
  const dateFr = addDays(today, -days);
  const dateTo = addDays(today, -4); // 최근 3일(+UTC 경계 1일)은 greenp-sync-v2가 담당
  const runStartedAt = new Date(Date.now() - 5000).toISOString();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const result: Record<string, any> = { dateFr, dateTo, dry };
  try {
    const cookie = await greenpLogin();
    const raw = await fetchRange(cookie, dateFr, dateTo);
    const rows = raw.map((r: any) => ({
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
    })).filter((r: any) => r.joborder_date && r.joborder_date >= dateFr && r.joborder_date <= dateTo);
    result.fetched = rows.length;

    // 바뀐 것 요약(상태 변경·삭제·신규) — 미러와 비교
    const { data: before } = await supabase.from("greenp_joborders")
      .select("joborder_date, joborder_no, work_type, status_code").gte("joborder_date", dateFr).lte("joborder_date", dateTo);
    const k = (r: any) => `${r.joborder_date}|${r.joborder_no}|${r.work_type}`;
    const beforeMap = new Map((before || []).map((r: any) => [k(r), String(r.status_code)]));
    const afterMap = new Map(rows.map((r: any) => [k(r), String(r.status_code)]));
    result.statusChanged = [...afterMap].filter(([key, s]) => beforeMap.has(key) && beforeMap.get(key) !== s).map(([key, s]) => `${key} ${beforeMap.get(key)}→${s}`);
    result.removed = [...beforeMap.keys()].filter((key) => !afterMap.has(key));
    result.added = [...afterMap.keys()].filter((key) => !beforeMap.has(key));
    result.removedCount = result.removed.length;

    // 안전장치: 그린ERP가 0건을 주거나 미러의 절반 넘게 사라지면 반영하지 않음
    if (rows.length === 0 || (beforeMap.size > 0 && result.removedCount > beforeMap.size / 2)) {
      result.skipped = "응답이 비었거나 너무 많이 사라짐 — 미러 유지";
      result.ok = true;
      return new Response(JSON.stringify(result, null, 1), { headers: { "Content-Type": "application/json" } });
    }
    if (!dry) {
      const { error } = await supabase.from("greenp_joborders").insert(rows);
      if (error) throw new Error("greenp_joborders insert 실패: " + error.message);
      const { error: delErr } = await supabase.from("greenp_joborders").delete()
        .gte("joborder_date", dateFr).lte("joborder_date", dateTo).lt("synced_at", runStartedAt);
      if (delErr) throw new Error("옛 행 정리 실패: " + delErr.message);
      await supabase.from("greenp_sync_logs").insert({ target_table: "greenp_joborders(refresh)", record_count: rows.length, status: "성공" });
    }
    result.ok = true;
    return new Response(JSON.stringify(result, null, 1), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    result.ok = false;
    result.error = String((e as Error)?.message || e);
    try { await supabase.from("greenp_sync_logs").insert({ target_table: "greenp_joborders(refresh)", record_count: 0, status: "실패" }); } catch (_e) { /* ignore */ }
    return new Response(JSON.stringify(result, null, 1), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
