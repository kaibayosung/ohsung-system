// dashboard-instant-sync: 그린ERP 작업지시서(헤더+상세)를 JSON으로 읽어와
// osungsteel.servehttp.com:38080 대시보드의 POST /api/erp 형식으로 매핑해서 등록하는 함수.
//
// 기본은 dry-run(commit=false) — 대시보드에 실제로 아무것도 쓰지 않고, 만들어질 페이로드와
// 타이밍만 반환합니다. commit=true로 호출해야만 실제로 POST /api/erp를 날립니다.
//
// 상세(품명/규격/길이/중량) 확보 경로: POST osungProdJoborderListAction.php
//   submitType=selectDetail1 (품명/규격/길이/원중량/사용중량), selectDetail2 (작업SIZE 내역 = 가공규칙)
//   파라미터는 selectMdate / selectMjunp.
//
// [버전 이력 요약]
// v2  단가/금액을 greenp_joborder_detail에서 채움.
// v3  mjunp는 work_type(SLITING/SLITING2/LEVELLING)별로 독립 채번 → dedup 키 (mjunp, mdate, work_type).
// v4  미완료 작업 이월(rollover): erp_data.work_date만 오늘로 UPDATE (새 행 INSERT 안 함).
// v5  이월 전 대시보드 자체 상태(erp_data.status='완료')도 확인(AND) + 되돌리기(reconcile).
// v6  같은 작업번호에서 품명이 정정되면 기존 대시보드 행을 UPDATE(내용 변경 감지).
// v7  LEVELLING "나머지" 확정으로 새 번호가 발급되면 기존 미완료 행을 이어받아 UPDATE.
// v8  내용 변경 감지 범위를 품명 → (품명/규격/길이/중량/가공규칙) 서명(content_sig)으로 확대.
// v9  [버그 수정] UPDATE의 affectedRows=0(값 변화 없음)을 "행 없음"으로 오판해 중복 POST하던 문제 —
//     행 존재 여부는 SELECT로만 판단.
// v10 [배포 버전 16] 이어받기·이월 경로의 affectedRows 오판 제거, 단가·금액 서명 포함(COALESCE),
//     DB 접속 정보 환경변수화.
// v11 [배포 버전 17] 비밀번호 평문 폴백 제거.
// v12 [2026-10-12] 같은 코일이 대시보드에 두 줄로 생기는 문제의 근본 수정.
//     확인된 중복 경로:
//      (A) 이월 + 재발행: 전날 미완료 행이 아침에 오늘로 이월된 뒤, 사무실이 같은 코일로 오늘 날짜
//          새 작업지시서를 다시 발행 → (작업지시일, 번호, 라인) 키가 새것이라 새 행 POST.
//          (10/12 아침 25쌍)
//      (B) 같은 작업지시서에서 라인만 변경(SLITING ↔ SLITING2): 키에 work_type이 들어 있어 새 키로
//          보이고 새 행 POST, 옛 라인 행은 그대로 남음. (9/28, 10/1, 10/7, 10/8, 10/12 반복)
//      (C) 다음 날 재발행(이월 전/이월 대상 아님): 전날 행 + 새 행.
//      (D) 동시 실행·응답 유실: POST는 성공했는데 로그 기록 전에 실패/타임아웃 → 다음 사이클 재POST.
//     수정:
//      1) 이어받기(adopt, 슬리팅 계열만): 새 작업지시서의 코일(회사+품명+규격)과 같은 코일의 열린 행
//         (대시보드에 존재, 완료 아님)이 최근 14일 로그에 있고, 그 행의 원래 작업지시서가 "과거 날짜"이거나
//         "오늘 ERP 목록에 더 이상 없는 키"(라인 변경·삭제 재발행)이면 새 행을 만들지 않고 그 행을
//         UPDATE(라인·날짜·내용)해서 새 키에 연결. 옛 로그는 retired_at으로 은퇴 → 이월·변경감지·되돌리기에서 제외.
//         SLITING ↔ LEVELLING처럼 공정이 다른 경우(같은 코일을 슬리팅 후 레벨링)는 별개 작업이라 건드리지 않음.
//      2) 선점(claim) 후 POST: 로그 행을 먼저 INSERT(유니크 키)해서 잡은 실행만 POST. POST 실패 시 선점 해제,
//         응답 유실(id 없음)은 다음 사이클에 대시보드에서 찾아 연결.
//      3) 이월 가드: 오늘 같은 코일의 새 작업지시서가 이미 연결돼 있으면 옛 행은 이월하지 않고 은퇴.
//      4) 정리(heal): 오늘 보드에 같은 코일(슬리팅 계열)의 열린 행이 2개 이상이면, 오늘 ERP에 살아 있는
//         키의 행을 남기고, 나머지 중 '준비'·미시작이고 원래 날짜가 과거인 행은 원래 작업지시일로 되돌림
//         (삭제하지 않음 — 되돌릴 수 있음). 그 밖의 경우는 경고만 남김.
//     ※ 대시보드 행을 DELETE하는 코드는 없다(삭제는 사람이 확인 후 직접).

import forge from "npm:node-forge@1.3.1";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Client as MysqlClient } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const GREENP_BASE = "http://greenpweb.co.kr";
const DASHBOARD_BASE = "http://osungsteel.servehttp.com:38080";

// 레벨러/대시보드 실제 MariaDB — dashboard-price-backfill과 동일한 접속 정보.
// 비밀번호는 Supabase Edge Function 시크릿 LEVELER_DB_PASS 에서만 읽는다(코드에 평문 금지).
const LEVELER_DB_HOST = Deno.env.get("LEVELER_DB_HOST") || "osungsteel.servehttp.com";
const LEVELER_DB_PORT = parseInt(Deno.env.get("LEVELER_DB_PORT") || "33306", 10);
const LEVELER_DB_USER = Deno.env.get("LEVELER_DB_USER") || "ohsung";
const LEVELER_DB_PASS = Deno.env.get("LEVELER_DB_PASS") || "";
const LEVELER_DB_NAME = Deno.env.get("LEVELER_DB_NAME") || "ohsung";

const ADOPT_WINDOW_DAYS = 14; // v12: 이어받기 후보를 찾는 기간
const CLAIM_STALE_MS = 3 * 60 * 1000; // v12: 이 시간 넘게 id가 비어 있는 선점은 복구 대상

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

async function greenpLogin(): Promise<{ cookie: string; ms: number }> {
  const t0 = performance.now();
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

  const cookie = [keyCookie, loginCookie].filter(Boolean).join("; ");
  return { cookie, ms: Math.round(performance.now() - t0) };
}

async function postAction(cookie: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${GREENP_BASE}/greenp/prod/osung/osungProdJoborderListAction.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams(params).toString(),
  });
  return await res.json();
}

function toNum(v: any): number {
  const n = parseFloat(String(v ?? "0").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseLengthField(raw: any): { value: number | null; note: string | null } {
  if (raw === null || raw === undefined) return { value: null, note: null };
  const s = String(raw).trim();
  if (s === "") return { value: null, note: null };
  const cleaned = s.replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return { value: Math.round(parseFloat(cleaned)), note: null };
  }
  return { value: null, note: s };
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// v8/v10: 대시보드에 반영한 "내용"의 서명. 이 값이 그린ERP 현재 내용과 달라지면 대시보드 행을 갱신한다.
function contentSig(p: {
  productName: any; specification: any; length: any; originalWeight: any; usedWeight: any; processRule: any;
  unitPrice?: any; amount?: any;
}): string {
  return JSON.stringify([
    String(p.productName ?? "").trim(),
    String(p.specification ?? "").trim(),
    p.length ?? null,
    Number(p.originalWeight ?? 0),
    Number(p.usedWeight ?? 0),
    String(p.processRule ?? "").trim(),
    numOrNull(p.unitPrice),
    numOrNull(p.amount),
  ]);
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(new Array(Math.min(concurrency, items.length)).fill(0).map(worker));
  return results;
}

function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600000);
  return kst.toISOString().slice(0, 10);
}

function dateMinus(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function dedupKey(mjunp: string, workType: string): string {
  return `${mjunp}|${workType}`;
}

function erpStatusKey(mdate: string, mjunp: string, workType: string): string {
  return `${mdate}|${mjunp}|${workType}`;
}

// v12: 공정 계열 — SLITING과 SLITING2는 같은 공정의 라인 차이(서로 옮겨질 수 있음), LEVELLING은 별개 공정.
function family(workType: any): string {
  const w = String(workType ?? "").toUpperCase();
  if (w.startsWith("SLITING")) return "SL";
  if (w === "LEVELLING") return "LV";
  return w;
}

// v12: 코일 번호처럼 보이는 품명만 같은 코일 판정에 쓴다("CR", "칼라", "SPCC", "FHD" 같은 일반 품명 제외).
function isCoilLike(productName: any): boolean {
  const p = String(productName ?? "").trim();
  return p.length >= 6 && /\d/.test(p);
}

function coilKey(company: any, product: any): string {
  return `${String(company ?? "").trim()}|${String(product ?? "").trim().toUpperCase()}`;
}

function normSpec(s: any): string {
  return String(s ?? "").toUpperCase().replace(/\s+/g, "");
}

function dateStr(v: any): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "").slice(0, 10);
}

type BoardRow = { status: string; started: boolean; workDate: string; workType: string; spec: string };

// 주어진 id들의 (존재하는 행의) 상태. 맵에 id가 없으면 = 대시보드에 그 행이 없다는 뜻.
async function fetchBoardRows(mysql: MysqlClient, ids: number[]): Promise<Map<number, BoardRow>> {
  const m = new Map<number, BoardRow>();
  const uniq = [...new Set(ids.filter((x) => Number.isFinite(x)))];
  if (uniq.length === 0) return m;
  const placeholders = uniq.map(() => "?").join(",");
  const res = await mysql.execute(
    `SELECT id, status, started_at, work_date, work_type, specification FROM erp_data WHERE id IN (${placeholders})`,
    uniq,
  );
  for (const r of (res.rows || []) as any[]) {
    m.set(Number(r.id), {
      status: String(r.status ?? ""),
      started: r.started_at !== null && r.started_at !== undefined && String(r.started_at) !== "",
      workDate: dateStr(r.work_date),
      workType: String(r.work_type ?? ""),
      spec: String(r.specification ?? ""),
    });
  }
  return m;
}

async function fetchBoardStatusByIds(mysql: MysqlClient, ids: number[]): Promise<Map<number, string>> {
  const rows = await fetchBoardRows(mysql, ids);
  const m = new Map<number, string>();
  for (const [id, r] of rows) m.set(id, r.status);
  return m;
}

function connectMysql(): Promise<MysqlClient> {
  if (!LEVELER_DB_PASS) throw new Error("LEVELER_DB_PASS 시크릿이 설정되어 있지 않습니다.");
  return new MysqlClient().connect({
    hostname: LEVELER_DB_HOST,
    port: LEVELER_DB_PORT,
    username: LEVELER_DB_USER,
    password: LEVELER_DB_PASS,
    db: LEVELER_DB_NAME,
    timeout: 10000,
  });
}

async function fetchDetail(cookie: string, h: any, date: string) {
  const [d1, d2] = await Promise.all([
    postAction(cookie, {
      submitType: "selectDetail1", sort_field: "", sort_asc: "", mid: "1001",
      selectMdate: String(h.mdate ?? date), selectMjunp: String(h.mjunp ?? ""),
    }),
    postAction(cookie, {
      submitType: "selectDetail2", sort_field: "", sort_asc: "", mid: "1001",
      selectMdate: String(h.mdate ?? date), selectMjunp: String(h.mjunp ?? ""),
    }),
  ]);
  const item = (d1.data || [])[0] || {};
  const sizeRows = (d2.data || []) as any[];
  const processRule = sizeRows.map((r) => r.sdesc).filter(Boolean).join(", ");
  const lengthParsed = parseLengthField(item.smeter);
  return { item, processRule, lengthParsed };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayKST();
  const commit = url.searchParams.get("commit") === "true";
  const seedOnly = url.searchParams.get("seedOnly") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "1000", 10);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const timings: Record<string, number> = {};
  const t0 = performance.now();
  const result: Record<string, any> = { version: "v12", date, commit, seedOnly, mode: seedOnly ? "seed-only" : (commit ? "LIVE-WRITE" : "dry-run") };

  try {
    const { cookie, ms: loginMs } = await greenpLogin();
    timings.loginMs = loginMs;

    const listT0 = performance.now();
    const listJson = await postAction(cookie, {
      submitType: "select",
      sort_field: "",
      sort_asc: "",
      mid: "1001",
      uid: "5",
      sh_value: "",
      sh_value2: "",
      sh_date_fr: date,
      sh_date_to: date,
      gubunChk1: "y",
      gubunChk2: "y",
      gubunChk3: "y",
    });
    timings.listMs = Math.round(performance.now() - listT0);
    const allHeaders = ((listJson.data || []) as any[]).slice(0, limit);
    result.headerCount = allHeaders.length;
    // 오늘 그린ERP에 살아 있는 작업지시서 키 (작업지시일|번호|라인)
    const todayErpKeys = new Set(allHeaders.map((h) => erpStatusKey(String(h.mdate ?? date), String(h.mjunp), String(h.mgubun ?? ""))));

    // v12: 선점만 하고 id가 비어 있는 로그(응답 유실·실행 중단) 복구 — 대시보드에서 찾아 연결하거나, 못 찾으면 선점 해제.
    const claimRecovery: Record<string, any> = { checked: 0, attached: 0, released: 0, errors: [] as any[] };
    if (commit && !seedOnly) {
      try {
        const staleBefore = new Date(Date.now() - CLAIM_STALE_MS).toISOString();
        const { data: claims, error: claimErr } = await supabase
          .from("dashboard_sync_log")
          .select("id, mjunp, mdate, work_type, company_name, product_name")
          .eq("seeded", false)
          .is("dashboard_erp_id", null)
          .is("retired_at", null)
          .gte("mdate", dateMinus(date, 3))
          .lt("synced_at", staleBefore);
        if (claimErr) throw new Error(claimErr.message);
        claimRecovery.checked = (claims || []).length;
        if (claims && claims.length > 0) {
          let mysql: MysqlClient | null = null;
          try {
            mysql = await connectMysql();
            for (const c of claims) {
              let attachId: number | null = null;
              if (c.product_name) {
                const r = await mysql.execute(
                  `SELECT id FROM erp_data WHERE work_date = ? AND company_name = ? AND product_name = ? AND work_type = ? ORDER BY id DESC LIMIT 5`,
                  [c.mdate, c.company_name, c.product_name, c.work_type],
                );
                const ids = ((r.rows || []) as any[]).map((x) => Number(x.id));
                if (ids.length > 0) {
                  const { data: used } = await supabase.from("dashboard_sync_log").select("dashboard_erp_id").in("dashboard_erp_id", ids);
                  const usedSet = new Set((used || []).map((u: any) => Number(u.dashboard_erp_id)));
                  attachId = ids.find((x) => !usedSet.has(x)) ?? null;
                }
              }
              if (attachId) {
                const { error } = await supabase.from("dashboard_sync_log").update({ dashboard_erp_id: attachId }).eq("id", c.id);
                if (error) claimRecovery.errors.push({ id: c.id, error: error.message });
                else claimRecovery.attached++;
              } else {
                // 대시보드에 행이 없음 = POST가 실제로 안 됨 → 선점 해제해서 다음 사이클에 다시 등록되게 함.
                const { error } = await supabase.from("dashboard_sync_log").delete().eq("id", c.id).is("dashboard_erp_id", null);
                if (error) claimRecovery.errors.push({ id: c.id, error: error.message });
                else claimRecovery.released++;
              }
            }
          } finally {
            if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
          }
        }
        claimRecovery.ok = true;
      } catch (e) {
        claimRecovery.ok = false;
        claimRecovery.error = String((e as Error)?.message || e);
      }
    }
    result.claimRecovery = claimRecovery;

    const { data: alreadySyncedRows, error: syncLogErr } = await supabase
      .from("dashboard_sync_log")
      .select("mjunp, work_type")
      .eq("mdate", date);
    if (syncLogErr) throw new Error("dashboard_sync_log 조회 실패: " + syncLogErr.message);
    const alreadySynced = new Set(
      (alreadySyncedRows || []).map((r: any) => dedupKey(String(r.mjunp), String(r.work_type ?? "")))
    );

    const newHeaders = allHeaders.filter((h) => !alreadySynced.has(dedupKey(String(h.mjunp), String(h.mgubun ?? ""))));
    result.skippedAlreadySynced = allHeaders.length - newHeaders.length;
    result.newCount = newHeaders.length;

    if (seedOnly) {
      const seedRows = newHeaders.map((h) => ({
        mjunp: String(h.mjunp),
        mdate: date,
        board_date: date,
        work_type: String(h.mgubun ?? ""),
        company_name: h.mcomp ?? null,
        seeded: true,
      }));
      if (seedRows.length > 0) {
        const { error } = await supabase.from("dashboard_sync_log").upsert(seedRows, { onConflict: "mjunp,mdate,work_type", ignoreDuplicates: true });
        if (error) throw new Error("seed upsert 실패: " + error.message);
      }
      result.seededCount = seedRows.length;
      timings.totalMs = Math.round(performance.now() - t0);
      result.timings = timings;
      result.ok = true;
      return new Response(JSON.stringify(result, null, 1), { headers: { "Content-Type": "application/json" } });
    }

    const priceKey = (joborderNo: string, workType: string) => `${joborderNo}|${workType}`;
    const priceMap = new Map<string, { unit_price: number | null; amount: number | null }>();
    if (allHeaders.length > 0) {
      const mjunpList = [...new Set(allHeaders.map((h) => String(h.mjunp)))];
      const { data: detailRows, error: detailErr } = await supabase
        .from("greenp_joborder_detail")
        .select("joborder_no, work_type, unit_price, amount")
        .eq("joborder_date", date)
        .in("joborder_no", mjunpList);
      if (detailErr) {
        result.priceLookupError = detailErr.message;
      } else {
        for (const r of detailRows || []) {
          priceMap.set(priceKey(String(r.joborder_no), String(r.work_type)), {
            unit_price: r.unit_price ?? null,
            amount: r.amount ?? null,
          });
        }
      }
    }
    result.priceMatchedCount = 0;

    // v7: LEVELLING "나머지" 확정 이어받기 — 같은 회사명+코일ID(품명)+규격으로, 최근 3일 이내 아직
    // "완료"되지 않은 기존 동기화 건이 정확히 하나 있는 LEVELLING 신규 작업지시서는 새 행을 만들지 않고
    // 그 기존 행을 갱신한다. 후보가 0건이거나 2건 이상(모호)이면 평소대로 신규 등록.
    // v12: 은퇴한 로그는 후보에서 제외.
    const levelingMergeT0 = performance.now();
    const levelingMerge: Record<string, any> = { checked: 0, matched: 0, merged: 0, ambiguous: 0, errors: [] as any[] };
    const mergedHeaderKeys = new Set<string>();
    try {
      const levelingNewHeaders = newHeaders.filter((h) => String(h.mgubun ?? "") === "LEVELLING");
      levelingMerge.checked = levelingNewHeaders.length;

      if (levelingNewHeaders.length > 0) {
        const { data: recentLog, error: recentErr } = await supabase
          .from("dashboard_sync_log")
          .select("id, mjunp, mdate, work_type, dashboard_erp_id, company_name, product_name")
          .eq("work_type", "LEVELLING")
          .eq("seeded", false)
          .is("retired_at", null)
          .not("dashboard_erp_id", "is", null)
          .gte("mdate", dateMinus(date, 3))
          .lte("mdate", date);
        if (recentErr) throw new Error("leveling merge 후보 조회 실패: " + recentErr.message);

        const candidatesByKey = new Map<string, any[]>();
        for (const r of recentLog || []) {
          const key = `${r.company_name}|${r.product_name}`;
          const arr = candidatesByKey.get(key) || [];
          arr.push(r);
          candidatesByKey.set(key, arr);
        }

        if ((recentLog || []).length > 0) {
          let mysql: MysqlClient | null = null;
          try {
            mysql = await connectMysql();
            const board = await fetchBoardRows(mysql, (recentLog || []).map((r: any) => Number(r.dashboard_erp_id)));

            for (const h of levelingNewHeaders) {
              const { item, processRule, lengthParsed } = await fetchDetail(cookie, h, date);
              const productName = (item.spum ?? "").toString().trim();
              const companyName = String(h.mcomp ?? "").trim();
              const specification = (item.sspec ?? "").toString().trim();
              if (!productName) continue;

              const key = `${companyName}|${productName}`;
              const sameCoil = (candidatesByKey.get(key) || []).filter((c) => String(c.mjunp) !== String(h.mjunp));
              const openCandidates = sameCoil.filter((c) => {
                const b = board.get(Number(c.dashboard_erp_id));
                if (!b) return false; // 대시보드에 행이 없음(삭제됨)
                if (b.status === "완료") return false;
                if (specification && b.spec && b.spec !== specification) return false;
                return true;
              });

              if (openCandidates.length === 0) continue;
              if (openCandidates.length > 1) {
                levelingMerge.ambiguous++;
                continue;
              }

              const target = openCandidates[0];
              levelingMerge.matched++;
              const matched = priceMap.get(priceKey(String(h.mjunp), String(h.mgubun)));
              const mergePayload = {
                workDate: h.mdate,
                companyName: h.mcomp,
                workType: h.mgubun,
                productName,
                specification: item.sspec ?? null,
                length: lengthParsed.value,
                originalWeight: toNum(item.sweight),
                usedWeight: toNum(item.sweightw),
                unitPrice: matched?.unit_price ?? null,
                amount: matched?.amount ?? null,
                processRule: processRule || null,
              };

              mergedHeaderKeys.add(dedupKey(String(h.mjunp), String(h.mgubun ?? "")));
              result.levelingMergeCandidates = result.levelingMergeCandidates || [];
              result.levelingMergeCandidates.push({
                from_mjunp: target.mjunp, from_mdate: target.mdate, to_mjunp: h.mjunp, to_mdate: h.mdate,
                company_name: companyName, product_name: productName, dashboard_erp_id: target.dashboard_erp_id,
              });

              if (!commit) continue;

              try {
                await mysql.execute(
                  `UPDATE erp_data SET company_name=?, product_name=?, specification=?, length=?, original_weight=?, used_weight=?, unit_price=COALESCE(?, unit_price), amount=COALESCE(?, amount), process_rule=?, work_date=? WHERE id=?`,
                  [
                    mergePayload.companyName, mergePayload.productName, mergePayload.specification, mergePayload.length,
                    mergePayload.originalWeight, mergePayload.usedWeight, mergePayload.unitPrice, mergePayload.amount,
                    mergePayload.processRule, mergePayload.workDate, target.dashboard_erp_id,
                  ],
                );
                const { error: upsertErr } = await supabase.from("dashboard_sync_log").upsert({
                  mjunp: String(h.mjunp),
                  mdate: String(h.mdate ?? date),
                  board_date: String(h.mdate ?? date),
                  work_type: String(h.mgubun ?? ""),
                  dashboard_erp_id: target.dashboard_erp_id,
                  company_name: mergePayload.companyName,
                  product_name: mergePayload.productName,
                  content_sig: contentSig(mergePayload),
                  seeded: false,
                }, { onConflict: "mjunp,mdate,work_type" });
                if (upsertErr) levelingMerge.errors.push({ mjunp: h.mjunp, stage: "log_upsert", error: upsertErr.message });
                else levelingMerge.merged++;
              } catch (e) {
                levelingMerge.errors.push({ mjunp: h.mjunp, error: String((e as Error)?.message || e) });
              }
            }
          } finally {
            if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
          }
        }
      }
      levelingMerge.ok = true;
    } catch (e) {
      levelingMerge.ok = false;
      levelingMerge.error = String((e as Error)?.message || e);
    }
    timings.levelingMergeMs = Math.round(performance.now() - levelingMergeT0);
    result.levelingMerge = levelingMerge;

    const newHeadersToInsert = newHeaders.filter((h) => !mergedHeaderKeys.has(dedupKey(String(h.mjunp), String(h.mgubun ?? ""))));

    const detailT0 = performance.now();
    const payloads = await mapWithConcurrency(newHeadersToInsert, 3, async (h) => {
      const { item, processRule, lengthParsed } = await fetchDetail(cookie, h, date);
      const matched = priceMap.get(priceKey(String(h.mjunp), String(h.mgubun)));
      return {
        _source: { mjunp: String(h.mjunp), mdate: String(h.mdate ?? date), workType: String(h.mgubun ?? "") },
        payload: {
          workDate: h.mdate,
          companyName: h.mcomp,
          workType: h.mgubun,
          productName: item.spum ?? null,
          specification: item.sspec ?? null,
          length: lengthParsed.value,
          originalWeight: toNum(item.sweight),
          usedWeight: toNum(item.sweightw),
          unitPrice: matched?.unit_price ?? null,
          amount: matched?.amount ?? null,
          processRule: processRule || null,
        },
        _priceMatched: !!matched,
      };
    });
    timings.detailMs = Math.round(performance.now() - detailT0);
    result.payloads = payloads;
    result.priceMatchedCount = payloads.filter((p: any) => p._priceMatched).length;

    // v12 (1) 이어받기(adopt) — 슬리팅 계열 새 작업지시서가 같은 코일의 열린 기존 행을 이어받는다.
    const adoptT0 = performance.now();
    const adopt: Record<string, any> = { checked: 0, adopted: 0, parkedExtra: 0, warnings: [] as any[], errors: [] as any[], candidates: [] as any[] };
    const adoptedSources = new Set<string>();
    try {
      const slPayloads = payloads.filter((p: any) =>
        family(p._source.workType) === "SL" && isCoilLike(p.payload.productName) && String(p.payload.companyName ?? "").trim() !== ""
      );
      adopt.checked = slPayloads.length;
      if (slPayloads.length > 0) {
        const names = [...new Set(slPayloads.map((p: any) => String(p.payload.productName).trim()))];
        const { data: logs, error: logErr } = await supabase
          .from("dashboard_sync_log")
          .select("id, mjunp, mdate, board_date, work_type, dashboard_erp_id, company_name, product_name")
          .eq("seeded", false)
          .is("retired_at", null)
          .not("dashboard_erp_id", "is", null)
          .gte("mdate", dateMinus(date, ADOPT_WINDOW_DAYS))
          .lte("mdate", date)
          .in("product_name", names);
        if (logErr) throw new Error("adopt 후보 조회 실패: " + logErr.message);

        const byCoil = new Map<string, any[]>();
        for (const l of logs || []) {
          if (family(l.work_type) !== "SL") continue;
          const k = coilKey(l.company_name, l.product_name);
          const arr = byCoil.get(k) || [];
          arr.push(l);
          byCoil.set(k, arr);
        }

        if ((logs || []).length > 0) {
          let mysql: MysqlClient | null = null;
          try {
            mysql = await connectMysql();
            const board = await fetchBoardRows(mysql, (logs || []).map((l: any) => Number(l.dashboard_erp_id)));
            for (const p of slPayloads) {
              const src = p._source;
              const cands = (byCoil.get(coilKey(p.payload.companyName, p.payload.productName)) || []).filter((c) => {
                if (String(c.mdate) === src.mdate && String(c.mjunp) === src.mjunp && String(c.work_type) === src.workType) return false;
                // 원래 작업지시서가 과거 날짜이거나, 오늘 ERP 목록에 더 이상 없는 키(라인 변경·삭제 후 재발행)일 때만
                const stale = String(c.mdate) < date || !todayErpKeys.has(erpStatusKey(String(c.mdate), String(c.mjunp), String(c.work_type)));
                if (!stale) return false;
                const b = board.get(Number(c.dashboard_erp_id));
                if (!b) return false; // 대시보드에서 이미 지워진 행
                if (b.status === "완료") return false;
                if (p.payload.specification && b.spec && normSpec(b.spec) !== normSpec(p.payload.specification)) return false;
                return true;
              });
              if (cands.length === 0) continue;
              cands.sort((a, b) => Number(b.dashboard_erp_id) - Number(a.dashboard_erp_id));
              const target = cands[0];
              const extras = cands.slice(1);
              adoptedSources.add(erpStatusKey(src.mdate, src.mjunp, src.workType));
              adopt.candidates.push({
                to: `${src.mdate}#${src.mjunp} ${src.workType}`,
                product_name: p.payload.productName,
                adopt_erp_id: target.dashboard_erp_id,
                from: `${target.mdate}#${target.mjunp} ${target.work_type}`,
                extras: extras.map((x) => ({ erp_id: x.dashboard_erp_id, from: `${x.mdate}#${x.mjunp} ${x.work_type}` })),
              });
              if (!commit) continue;

              try {
                // 1) 새 키로 로그를 먼저 선점(유니크 키) — 이미 다른 실행이 잡았으면 건너뜀
                const { data: ins, error: insErr } = await supabase.from("dashboard_sync_log").insert({
                  mjunp: src.mjunp,
                  mdate: src.mdate,
                  board_date: date,
                  work_type: src.workType,
                  dashboard_erp_id: target.dashboard_erp_id,
                  company_name: p.payload.companyName,
                  product_name: p.payload.productName,
                  content_sig: contentSig(p.payload),
                  seeded: false,
                }).select("id").single();
                if (insErr) {
                  if ((insErr as any).code === "23505") continue;
                  throw new Error("adopt 로그 선점 실패: " + insErr.message);
                }
                // 2) 기존 행을 새 작업지시서 내용·라인·날짜로 갱신 (존재는 위 SELECT로 확인됨)
                await mysql.execute(
                  `UPDATE erp_data SET work_type=?, work_date=?, company_name=?, product_name=?, specification=?, length=?, original_weight=?, used_weight=?, unit_price=COALESCE(?, unit_price), amount=COALESCE(?, amount), process_rule=? WHERE id=?`,
                  [
                    src.workType, date, p.payload.companyName, p.payload.productName, p.payload.specification, p.payload.length,
                    p.payload.originalWeight, p.payload.usedWeight, p.payload.unitPrice, p.payload.amount, p.payload.processRule,
                    target.dashboard_erp_id,
                  ],
                );
                // 3) 옛 로그 은퇴
                const nowIso = new Date().toISOString();
                await supabase.from("dashboard_sync_log").update({
                  retired_at: nowIso, retired_reason: "adopted_by_new_joborder", superseded_by: ins.id, board_date: date,
                }).eq("id", target.id);
                adopt.adopted++;
                // 4) 같은 코일의 다른 열린 행(이미 생긴 중복): '준비'·미시작이고 원래 날짜가 과거면 원래 날짜로 되돌림
                for (const x of extras) {
                  const b = board.get(Number(x.dashboard_erp_id))!;
                  if (b.status === "준비" && !b.started && String(x.mdate) < date) {
                    await mysql.execute(`UPDATE erp_data SET work_date = ? WHERE id = ?`, [x.mdate, x.dashboard_erp_id]);
                    await supabase.from("dashboard_sync_log").update({
                      retired_at: nowIso, retired_reason: "duplicate_parked", superseded_by: ins.id, board_date: x.mdate,
                    }).eq("id", x.id);
                    adopt.parkedExtra++;
                  } else {
                    adopt.warnings.push({ product_name: p.payload.productName, erp_id: x.dashboard_erp_id, status: b.status, note: "같은 코일의 열린 행이 더 있음(시작됨 또는 오늘 날짜) — 사람이 확인" });
                  }
                }
              } catch (e) {
                adopt.errors.push({ mjunp: src.mjunp, work_type: src.workType, error: String((e as Error)?.message || e) });
                adoptedSources.delete(erpStatusKey(src.mdate, src.mjunp, src.workType)); // 실패하면 아래 일반 등록으로
                // 단, 선점 로그가 남아 있으면 일반 등록도 건너뛰게 된다(중복 방지 우선) — 다음 사이클 복구 대상
              }
            }
          } finally {
            if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
          }
        }
      }
      adopt.ok = true;
    } catch (e) {
      adopt.ok = false;
      adopt.error = String((e as Error)?.message || e);
    }
    timings.adoptMs = Math.round(performance.now() - adoptT0);
    result.adopt = adopt;

    // v12 (2) 일반 등록 — 선점(claim) 후 POST
    if (commit) {
      const commitT0 = performance.now();
      const postResults: any[] = [];
      for (const p of payloads) {
        const src = p._source;
        if (adoptedSources.has(erpStatusKey(src.mdate, src.mjunp, src.workType))) continue;
        // 이어받기 단계에서 선점이 이미 생겼을 수 있으므로 선점 INSERT가 곧 중복 검사
        const { data: claim, error: claimErr } = await supabase.from("dashboard_sync_log").insert({
          mjunp: src.mjunp,
          mdate: src.mdate,
          board_date: src.mdate,
          work_type: src.workType,
          dashboard_erp_id: null,
          company_name: p.payload.companyName,
          product_name: p.payload.productName,
          seeded: false,
        }).select("id").single();
        if (claimErr) {
          postResults.push({ source: src, skipped: (claimErr as any).code === "23505" ? "already_claimed" : "claim_failed", error: claimErr.message });
          continue;
        }
        let res: Response | null = null;
        let body: any = null;
        try {
          res = await fetch(`${DASHBOARD_BASE}/api/erp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p.payload),
          });
          try { body = await res.json(); } catch (_e) { /* ignore */ }
        } catch (e) {
          // 네트워크 오류 — 실제로 들어갔는지 모르므로 선점은 남겨 두고 다음 사이클 복구(claimRecovery)에 맡김
          postResults.push({ source: src, status: 0, error: String((e as Error)?.message || e) });
          continue;
        }
        postResults.push({ source: src, status: res.status, body });
        if (res.status >= 200 && res.status < 300) {
          if (body?.id) {
            const { error } = await supabase.from("dashboard_sync_log").update({
              dashboard_erp_id: body.id, content_sig: contentSig(p.payload),
            }).eq("id", claim.id);
            if (error) postResults.push({ source: src, stage: "log_update", error: error.message });
          }
          // id가 응답에 없으면 선점을 남겨 두고 복구 단계에서 대시보드에서 찾아 연결
        } else {
          // 대시보드가 거절 — 행이 생기지 않았으므로 선점 해제(다음 사이클 재시도)
          await supabase.from("dashboard_sync_log").delete().eq("id", claim.id).is("dashboard_erp_id", null);
        }
      }
      timings.commitMs = Math.round(performance.now() - commitT0);
      result.commitResults = postResults;
    }

    // v6/v8/v9/v10: 내용 변경 감지 — 오늘 이미 동기화된 건의 그린ERP 현재 내용 서명을 비교해 다르면 갱신.
    // v12: 은퇴한 로그 제외.
    const contentSyncT0 = performance.now();
    const contentSync: Record<string, any> = { checked: 0, changed: 0, updated: 0, recreated: 0, errors: [] as any[] };
    try {
      const { data: syncedRows, error: syncedErr } = await supabase
        .from("dashboard_sync_log")
        .select("id, mjunp, mdate, work_type, dashboard_erp_id, company_name, product_name, content_sig")
        .eq("mdate", date)
        .eq("seeded", false)
        .is("retired_at", null)
        .not("dashboard_erp_id", "is", null);
      if (syncedErr) throw new Error("content-sync 대상 조회 실패: " + syncedErr.message);

      const syncedMap = new Map<string, any>();
      for (const r of syncedRows || []) {
        syncedMap.set(dedupKey(String(r.mjunp), String(r.work_type ?? "")), r);
      }

      const existingHeaders = allHeaders.filter((h) => syncedMap.has(dedupKey(String(h.mjunp), String(h.mgubun ?? ""))));
      contentSync.checked = existingHeaders.length;

      const contentCandidates = await mapWithConcurrency(existingHeaders, 3, async (h) => {
        const logRow = syncedMap.get(dedupKey(String(h.mjunp), String(h.mgubun ?? "")));
        const { item, processRule, lengthParsed } = await fetchDetail(cookie, h, date);
        const currentProductName = (item.spum ?? "").toString().trim() || null;
        if (!currentProductName) return null;

        const matched = priceMap.get(priceKey(String(h.mjunp), String(h.mgubun)));
        const payload = {
          workDate: h.mdate,
          companyName: h.mcomp,
          workType: h.mgubun,
          productName: currentProductName,
          specification: item.sspec ?? null,
          length: lengthParsed.value,
          originalWeight: toNum(item.sweight),
          usedWeight: toNum(item.sweightw),
          unitPrice: matched?.unit_price ?? null,
          amount: matched?.amount ?? null,
          processRule: processRule || null,
        };
        const sig = contentSig(payload);
        if (logRow.content_sig && logRow.content_sig === sig) return null;
        return { logRow, payload, sig };
      });

      const changed = contentCandidates.filter((c): c is NonNullable<typeof c> => !!c);
      contentSync.changed = changed.length;
      result.contentChangedCandidates = changed.map((c) => ({
        mjunp: c.logRow.mjunp,
        mdate: c.logRow.mdate,
        work_type: c.logRow.work_type,
        from: c.logRow.product_name,
        to: c.payload.productName,
        processRule: c.payload.processRule,
        unitPrice: c.payload.unitPrice,
        amount: c.payload.amount,
        firstSig: !c.logRow.content_sig,
        dashboard_erp_id: c.logRow.dashboard_erp_id,
      }));

      if (commit && changed.length > 0) {
        let mysql: MysqlClient | null = null;
        try {
          mysql = await connectMysql();
          for (const c of changed) {
            try {
              const existRes = await mysql.execute(`SELECT id FROM erp_data WHERE id = ?`, [c.logRow.dashboard_erp_id]);
              const rowExists = ((existRes.rows || []) as any[]).length > 0;
              if (rowExists) {
                await mysql.execute(
                  `UPDATE erp_data SET company_name=?, product_name=?, specification=?, length=?, original_weight=?, used_weight=?, unit_price=COALESCE(?, unit_price), amount=COALESCE(?, amount), process_rule=? WHERE id=?`,
                  [
                    c.payload.companyName,
                    c.payload.productName,
                    c.payload.specification,
                    c.payload.length,
                    c.payload.originalWeight,
                    c.payload.usedWeight,
                    c.payload.unitPrice,
                    c.payload.amount,
                    c.payload.processRule,
                    c.logRow.dashboard_erp_id,
                  ],
                );
                const { error: updErr } = await supabase
                  .from("dashboard_sync_log")
                  .update({ product_name: c.payload.productName, company_name: c.payload.companyName, content_sig: c.sig, synced_at: new Date().toISOString() })
                  .eq("id", c.logRow.id);
                if (updErr) contentSync.errors.push({ mjunp: c.logRow.mjunp, stage: "log_update", error: updErr.message });
                else contentSync.updated++;
              } else {
                const postRes = await fetch(`${DASHBOARD_BASE}/api/erp`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(c.payload),
                });
                let body: any = null;
                try { body = await postRes.json(); } catch (_e) { /* ignore */ }
                if (postRes.status >= 200 && postRes.status < 300 && body?.id) {
                  const { error: updErr } = await supabase
                    .from("dashboard_sync_log")
                    .update({
                      dashboard_erp_id: body.id,
                      product_name: c.payload.productName,
                      company_name: c.payload.companyName,
                      content_sig: c.sig,
                      synced_at: new Date().toISOString(),
                    })
                    .eq("id", c.logRow.id);
                  if (updErr) contentSync.errors.push({ mjunp: c.logRow.mjunp, stage: "log_update_recreate", error: updErr.message });
                  else contentSync.recreated++;
                } else {
                  contentSync.errors.push({ mjunp: c.logRow.mjunp, stage: "recreate_post", status: postRes.status, body });
                }
              }
            } catch (e) {
              contentSync.errors.push({ mjunp: c.logRow.mjunp, error: String((e as Error)?.message || e) });
            }
          }
        } finally {
          if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
        }
      }
      contentSync.ok = true;
    } catch (e) {
      contentSync.ok = false;
      contentSync.error = String((e as Error)?.message || e);
    }
    timings.contentSyncMs = Math.round(performance.now() - contentSyncT0);
    result.contentSync = contentSync;

    // v4/v5/v10: 미완료 작업 이월(rollover). v12: 은퇴 로그 제외 + 오늘 같은 코일의 새 작업지시서가 이미
    // 연결돼 있으면 옛 행은 이월하지 않고 은퇴(이월 가드).
    const rolloverT0 = performance.now();
    const rollover: Record<string, any> = {
      checked: 0, stillOpen: 0, alreadyDoneOnBoard: 0, missingOnBoard: 0, supersededToday: 0, updated: 0, skippedNoErpRow: 0, errors: [] as any[],
    };
    try {
      const { data: candidates, error: candErr } = await supabase
        .from("dashboard_sync_log")
        .select("id, mjunp, mdate, board_date, work_type, dashboard_erp_id, company_name, product_name")
        .eq("seeded", false)
        .is("retired_at", null)
        .not("dashboard_erp_id", "is", null)
        .lt("board_date", date);
      if (candErr) throw new Error("rollover 후보 조회 실패: " + candErr.message);
      rollover.checked = (candidates || []).length;

      let toRoll: any[] = [];
      if (candidates && candidates.length > 0) {
        const origDates = [...new Set(candidates.map((c: any) => c.mdate))];
        const { data: joborderRows, error: joErr } = await supabase
          .from("greenp_joborders")
          .select("joborder_no, joborder_date, work_type, status_code")
          .in("joborder_date", origDates);
        if (joErr) throw new Error("greenp_joborders 조회 실패: " + joErr.message);

        const statusMap = new Map<string, string>();
        for (const r of joborderRows || []) {
          statusMap.set(erpStatusKey(String(r.joborder_date), String(r.joborder_no), String(r.work_type)), String(r.status_code));
        }

        // 이월 가드용: 오늘 작업지시서로 이미 연결된 코일(슬리팅 계열)
        const { data: todayLogs } = await supabase
          .from("dashboard_sync_log")
          .select("id, company_name, product_name, work_type")
          .eq("mdate", date)
          .eq("seeded", false)
          .is("retired_at", null);
        const todayCoil = new Map<string, number>();
        for (const t of todayLogs || []) {
          if (family(t.work_type) === "SL" && isCoilLike(t.product_name)) todayCoil.set(coilKey(t.company_name, t.product_name), t.id);
        }

        const erpOpen: any[] = [];
        const superseded: any[] = [];
        for (const c of candidates) {
          const key = erpStatusKey(String(c.mdate), String(c.mjunp), String(c.work_type));
          const statusCode = statusMap.get(key);
          if (statusCode === undefined) {
            rollover.skippedNoErpRow++;
            continue;
          }
          if (statusCode === "3") continue; // 그린ERP 작업완료
          if (family(c.work_type) === "SL" && isCoilLike(c.product_name) && todayCoil.has(coilKey(c.company_name, c.product_name))) {
            superseded.push({ ...c, supersededBy: todayCoil.get(coilKey(c.company_name, c.product_name)) });
            continue;
          }
          erpOpen.push(c);
        }
        rollover.stillOpen = erpOpen.length;
        rollover.supersededToday = superseded.length;
        if (superseded.length > 0) {
          result.rolloverSuperseded = superseded.map((c) => ({ mjunp: c.mjunp, mdate: c.mdate, work_type: c.work_type, product_name: c.product_name, dashboard_erp_id: c.dashboard_erp_id }));
        }

        if (erpOpen.length > 0) {
          let mysql: MysqlClient | null = null;
          try {
            mysql = await connectMysql();
            const boardStatus = await fetchBoardStatusByIds(mysql, erpOpen.map((c) => Number(c.dashboard_erp_id)));
            const alreadyDoneOnBoard: any[] = [];
            const missingOnBoard: any[] = [];
            for (const c of erpOpen) {
              const erpId = Number(c.dashboard_erp_id);
              if (!boardStatus.has(erpId)) missingOnBoard.push(c);
              else if (boardStatus.get(erpId) === "완료") alreadyDoneOnBoard.push(c);
              else toRoll.push(c);
            }
            rollover.alreadyDoneOnBoard = alreadyDoneOnBoard.length;
            rollover.missingOnBoard = missingOnBoard.length;
            if (missingOnBoard.length > 0) {
              result.rolloverMissingOnBoard = missingOnBoard.map((c) => ({
                mjunp: c.mjunp, mdate: c.mdate, work_type: c.work_type, dashboard_erp_id: c.dashboard_erp_id,
              }));
            }

            if (commit) {
              for (const c of toRoll) {
                try {
                  await mysql.execute(`UPDATE erp_data SET work_date = ? WHERE id = ?`, [date, c.dashboard_erp_id]);
                  const { error: updErr } = await supabase
                    .from("dashboard_sync_log")
                    .update({ board_date: date, last_rolled_at: new Date().toISOString() })
                    .eq("id", c.id);
                  if (updErr) rollover.errors.push({ id: c.id, mjunp: c.mjunp, stage: "dashboard_sync_log_update", error: updErr.message });
                  else rollover.updated++;
                } catch (e) {
                  rollover.errors.push({ id: c.id, mjunp: c.mjunp, error: String((e as Error)?.message || e) });
                }
              }
              for (const c of [...alreadyDoneOnBoard, ...missingOnBoard]) {
                const { error: updErr } = await supabase
                  .from("dashboard_sync_log")
                  .update({ board_date: date })
                  .eq("id", c.id);
                if (updErr) rollover.errors.push({ id: c.id, mjunp: c.mjunp, stage: "board_date_update", error: updErr.message });
              }
            }
          } finally {
            if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
          }
        }
        if (commit && superseded.length > 0) {
          // 옛 행이 이미 오늘 보드에 올라와 있으면('준비'·미시작) 원래 작업지시일로 되돌린 뒤 은퇴
          let mysql: MysqlClient | null = null;
          try {
            mysql = await connectMysql();
            const board = await fetchBoardRows(mysql, superseded.map((c) => Number(c.dashboard_erp_id)));
            for (const c of superseded) {
              const b = board.get(Number(c.dashboard_erp_id));
              let parkedTo: string | null = null;
              if (b && b.workDate === date && b.status === "준비" && !b.started && String(c.mdate) < date) {
                await mysql.execute(`UPDATE erp_data SET work_date = ? WHERE id = ?`, [c.mdate, c.dashboard_erp_id]);
                parkedTo = String(c.mdate);
              } else if (b && b.workDate === date && b.status !== "완료") {
                rollover.errors.push({ id: c.id, mjunp: c.mjunp, stage: "superseded_on_board", note: "오늘 보드에 남아 있으나 자동 정리 불가(시작됨 등)", dashboard_erp_id: c.dashboard_erp_id });
              }
              const { error: updErr } = await supabase
                .from("dashboard_sync_log")
                .update({
                  retired_at: new Date().toISOString(), retired_reason: "superseded_before_rollover", superseded_by: c.supersededBy,
                  ...(parkedTo ? { board_date: parkedTo } : {}),
                })
                .eq("id", c.id);
              if (updErr) rollover.errors.push({ id: c.id, mjunp: c.mjunp, stage: "retire_superseded", error: updErr.message });
            }
          } finally {
            if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
          }
        }
      }
      result.rolloverCandidates = toRoll.map((c) => ({ mjunp: c.mjunp, mdate: c.mdate, work_type: c.work_type, company_name: c.company_name, product_name: c.product_name }));
      rollover.ok = true;
    } catch (e) {
      rollover.ok = false;
      rollover.error = String((e as Error)?.message || e);
    }
    timings.rolloverMs = Math.round(performance.now() - rolloverT0);
    result.rollover = rollover;

    // v5: 되돌리기(reconcile) — 오늘로 이월했는데 대시보드에서 "완료"인 건은 원래 날짜로. v12: 은퇴 로그 제외.
    const reconcileT0 = performance.now();
    const reconcile: Record<string, any> = { checked: 0, reverted: 0, errors: [] as any[] };
    try {
      const { data: rolledToday, error: rolledErr } = await supabase
        .from("dashboard_sync_log")
        .select("id, mjunp, mdate, board_date, work_type, dashboard_erp_id")
        .eq("seeded", false)
        .is("retired_at", null)
        .not("dashboard_erp_id", "is", null)
        .eq("board_date", date)
        .neq("mdate", date);
      if (rolledErr) throw new Error("reconcile 후보 조회 실패: " + rolledErr.message);
      reconcile.checked = (rolledToday || []).length;

      if (rolledToday && rolledToday.length > 0) {
        let mysql: MysqlClient | null = null;
        try {
          mysql = await connectMysql();
          const boardStatus = await fetchBoardStatusByIds(mysql, rolledToday.map((c: any) => Number(c.dashboard_erp_id)));
          for (const c of rolledToday) {
            if (boardStatus.get(Number(c.dashboard_erp_id)) !== "완료") continue;
            if (!commit) { reconcile.reverted++; continue; }
            try {
              await mysql.execute(`UPDATE erp_data SET work_date = ? WHERE id = ?`, [c.mdate, c.dashboard_erp_id]);
              const { error: updErr } = await supabase
                .from("dashboard_sync_log")
                .update({ board_date: c.mdate })
                .eq("id", c.id);
              if (updErr) reconcile.errors.push({ id: c.id, mjunp: c.mjunp, error: updErr.message });
              else reconcile.reverted++;
            } catch (e) {
              reconcile.errors.push({ id: c.id, mjunp: c.mjunp, error: String((e as Error)?.message || e) });
            }
          }
        } finally {
          if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
        }
      }
      reconcile.ok = true;
    } catch (e) {
      reconcile.ok = false;
      reconcile.error = String((e as Error)?.message || e);
    }
    timings.reconcileMs = Math.round(performance.now() - reconcileT0);
    result.reconcile = reconcile;

    // v12 (4) 정리(heal) — 오늘 보드에 같은 코일(슬리팅 계열)의 열린 행이 2개 이상이면 하나만 남긴다.
    const healT0 = performance.now();
    const heal: Record<string, any> = { groups: 0, parked: 0, warnings: [] as any[], errors: [] as any[], actions: [] as any[] };
    try {
      const { data: boardLogs, error: blErr } = await supabase
        .from("dashboard_sync_log")
        .select("id, mjunp, mdate, board_date, work_type, dashboard_erp_id, company_name, product_name")
        .eq("seeded", false)
        .is("retired_at", null)
        .not("dashboard_erp_id", "is", null)
        .eq("board_date", date);
      if (blErr) throw new Error("heal 대상 조회 실패: " + blErr.message);

      const groups = new Map<string, any[]>();
      for (const l of boardLogs || []) {
        if (family(l.work_type) !== "SL" || !isCoilLike(l.product_name)) continue;
        const k = coilKey(l.company_name, l.product_name);
        const arr = groups.get(k) || [];
        arr.push(l);
        groups.set(k, arr);
      }
      const multi = [...groups.values()].filter((g) => new Set(g.map((x) => Number(x.dashboard_erp_id))).size > 1);
      heal.groups = multi.length;

      if (multi.length > 0) {
        let mysql: MysqlClient | null = null;
        try {
          mysql = await connectMysql();
          const board = await fetchBoardRows(mysql, multi.flat().map((x) => Number(x.dashboard_erp_id)));
          for (const g of multi) {
            // 같은 대시보드 행을 가리키는 로그는 하나로 본다
            // 오늘 보드에 실제로 올라와 있는 행(상태 무관). 오늘 키 행이 이미 '완료'여도 옛 '준비' 중복은 정리 대상.
            const seen = new Set<number>();
            const onBoard = g.filter((x) => {
              const id = Number(x.dashboard_erp_id);
              if (seen.has(id)) return false;
              seen.add(id);
              const b = board.get(id);
              return !!b && b.workDate === date;
            });
            if (onBoard.length < 2) continue;
            const live = onBoard.filter((x) => String(x.mdate) === date && todayErpKeys.has(erpStatusKey(String(x.mdate), String(x.mjunp), String(x.work_type))));
            if (live.length > 1) {
              heal.warnings.push({ product_name: g[0].product_name, note: "오늘 ERP에 같은 코일 작업지시서가 2개 이상 살아 있음 — 사무실 확인 필요", erp_ids: live.map((x) => x.dashboard_erp_id) });
              continue;
            }
            const keep = live[0] ?? onBoard.slice().sort((a, b) => Number(b.dashboard_erp_id) - Number(a.dashboard_erp_id))[0];
            const open = onBoard.filter((x) => board.get(Number(x.dashboard_erp_id))!.status !== "완료");
            for (const o of open) {
              if (o === keep) continue;
              const b = board.get(Number(o.dashboard_erp_id))!;
              const canPark = b.status === "준비" && !b.started && String(o.mdate) < date;
              const action = { product_name: o.product_name, keep_erp_id: keep.dashboard_erp_id, other_erp_id: o.dashboard_erp_id, other_from: `${o.mdate}#${o.mjunp} ${o.work_type}`, parkTo: canPark ? o.mdate : null };
              heal.actions.push(action);
              if (!canPark) {
                heal.warnings.push({ ...action, status: b.status, started: b.started, note: "자동 정리 불가(시작됨·오늘 날짜 등) — 사람이 확인" });
                continue;
              }
              if (!commit) continue;
              try {
                await mysql.execute(`UPDATE erp_data SET work_date = ? WHERE id = ?`, [o.mdate, o.dashboard_erp_id]);
                const { error: updErr } = await supabase.from("dashboard_sync_log").update({
                  retired_at: new Date().toISOString(), retired_reason: "duplicate_parked", superseded_by: keep.id, board_date: o.mdate,
                }).eq("id", o.id);
                if (updErr) heal.errors.push({ id: o.id, error: updErr.message });
                else heal.parked++;
              } catch (e) {
                heal.errors.push({ id: o.id, error: String((e as Error)?.message || e) });
              }
            }
          }
        } finally {
          if (mysql) { try { await mysql.close(); } catch (_e) { /* ignore */ } }
        }
      }
      heal.ok = true;
    } catch (e) {
      heal.ok = false;
      heal.error = String((e as Error)?.message || e);
    }
    timings.healMs = Math.round(performance.now() - healT0);
    result.heal = heal;

    timings.totalMs = Math.round(performance.now() - t0);
    result.timings = timings;
    result.ok = true;

    await supabase.from("dashboard_sync_runs").insert({
      date,
      mode: result.mode,
      header_count: result.headerCount ?? null,
      new_count: result.newCount ?? result.seededCount ?? null,
      skipped_count: result.skippedAlreadySynced ?? null,
      committed_count: commit ? (result.commitResults?.filter((r: any) => r.status >= 200 && r.status < 300).length ?? 0) : null,
      rollover_checked: rollover.checked ?? null,
      rollover_updated: rollover.updated ?? null,
      rollover_already_done_on_board: rollover.alreadyDoneOnBoard ?? null,
      reconcile_reverted: reconcile.reverted ?? null,
      ok: true,
      timings,
      details: {
        version: "v12",
        adopt: { checked: adopt.checked, adopted: adopt.adopted, parkedExtra: adopt.parkedExtra, warnings: adopt.warnings.length, errors: adopt.errors.length },
        heal: { groups: heal.groups, parked: heal.parked, warnings: heal.warnings, errors: heal.errors.length },
        claimRecovery: { attached: claimRecovery.attached ?? 0, released: claimRecovery.released ?? 0 },
        rolloverSuperseded: rollover.supersededToday ?? 0,
      },
    });

    return new Response(JSON.stringify(result, null, 1), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    timings.totalMs = Math.round(performance.now() - t0);
    result.timings = timings;
    result.ok = false;
    result.error = String((err as Error)?.message || err);

    try {
      await supabase.from("dashboard_sync_runs").insert({
        date,
        mode: result.mode,
        header_count: result.headerCount ?? null,
        ok: false,
        error: result.error,
        timings,
      });
    } catch (_logErr) { /* 로그 실패는 무시 */ }

    return new Response(JSON.stringify(result, null, 1), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

// 알려진 한계:
// 1) 단가/금액은 content_sig에 포함. 미러(greenp_joborder_detail)에 단가가 아직 없으면 null로 간주(기존 값 유지).
// 2) dashboard_sync_log는 "우리가 보낸 것"만 추적 — 대시보드에서 사람이 직접 추가한 행은 중복 정리 대상이 아님.
// 3) 내용 변경 감지는 "오늘(date) 동기화된 건"만 대상.
// 4) 비고(메모)는 대시보드 /api/erp payload에 필드가 없어 동기화되지 않음.
// 5) 이월은 greenp_joborders(3일 롤링 미러) 기준 + 대시보드 자체 상태(AND).
// 6) LEVELLING "나머지 확정 이어받기"는 회사명+코일ID+규격 + 미완료 휴리스틱(최근 3일, 후보 2건 이상이면 건드리지 않음).
// 7) v12 이어받기·정리는 슬리팅 계열(SLITING/SLITING2)과 코일 번호 형태의 품명(6자 이상, 숫자 포함)에만 적용.
//    같은 날 ERP에 같은 코일 작업지시서가 2개 이상 살아 있으면 자동으로 합치지 않고 경고만 남김.
//    정리는 행을 지우지 않고 원래 작업지시일로 되돌림 — 영구 삭제는 사람이 확인 후 직접.
