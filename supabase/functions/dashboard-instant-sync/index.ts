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
//     (2026-10-06 대한강재 J9S8308 가공규칙만 정정된 경우 대시보드 미반영 사례)
// v9  [버그 수정, 2026-10-06] v8 배포 직후 오늘 건 일부가 대시보드에 중복 등록됨. 원인: MariaDB의
//     UPDATE는 "값이 실제로 바뀐 행 수"를 affectedRows로 돌려주므로, 내용이 이미 같아 변화가 없는
//     행은 정상인데도 affectedRows=0 → "행이 삭제됨"으로 오판해 새로 POST. 수정: UPDATE 전에 SELECT로
//     행 존재 여부를 먼저 확인하고, 존재하면 affectedRows와 관계없이 갱신 완료로 보고 재등록하지 않는다.
//     재등록(recreate)은 SELECT로 행이 없다고 확인된 경우에만 한다.
// v10 [배포 버전 16, 2026-10-08]
//     (a) LEVELLING 이어받기·이월(rollover) 경로의 affectedRows=0 오판 제거 — 행 존재 여부는 SELECT 결과로만 판단.
//     (b) content_sig에 단가(unitPrice)·금액(amount) 추가 — 단가만 정정돼도 대시보드에 반영.
//         ※ 배포 직후 오늘 건은 서명 형식이 바뀌어 1회 "변경"으로 잡혀 같은 값으로 UPDATE 됨(중복 등록 아님).
//     (c) 단가가 아직 미러에 없는 경우(null) 기존 대시보드 단가를 null로 덮어쓰지 않도록 COALESCE 사용.
//     (d) DB 접속 정보를 환경변수(LEVELER_DB_HOST/PORT/USER/PASS/NAME)로 읽도록 변경.
// v11 [배포 버전 17, 2026-10-08] 비밀번호 평문 폴백 제거 — LEVELER_DB_PASS 시크릿이 없으면 명확한 오류를 낸다.

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
// v10: 단가·금액 추가.
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

function dedupKey(mjunp: string, workType: string): string {
  return `${mjunp}|${workType}`;
}

function erpStatusKey(mdate: string, mjunp: string, workType: string): string {
  return `${mdate}|${mjunp}|${workType}`;
}

// 주어진 id들의 (존재하는 행의) status 맵. 맵에 id가 없으면 = 대시보드에 그 행이 없다는 뜻.
async function fetchBoardStatusByIds(mysql: MysqlClient, ids: number[]): Promise<Map<number, string>> {
  const statusById = new Map<number, string>();
  if (ids.length === 0) return statusById;
  const placeholders = ids.map(() => "?").join(",");
  const selRes = await mysql.execute(`SELECT id, status FROM erp_data WHERE id IN (${placeholders})`, ids);
  for (const r of (selRes.rows || []) as any[]) {
    statusById.set(Number(r.id), String(r.status));
  }
  return statusById;
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
  const result: Record<string, any> = { date, commit, seedOnly, mode: seedOnly ? "seed-only" : (commit ? "LIVE-WRITE" : "dry-run") };

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
    // 내용 변경 감지 대상인 "이미 동기화된" 건도 가격을 다시 채워 넣어야 하므로 allHeaders 전체를 조회.
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
    // v10: 대시보드에서 이미 지워진 행(SELECT 결과에 없음)은 후보에서 제외, affectedRows 판정 제거.
    const levelingMergeT0 = performance.now();
    const levelingMerge: Record<string, any> = { checked: 0, matched: 0, merged: 0, ambiguous: 0, errors: [] as any[] };
    const mergedHeaderKeys = new Set<string>();
    try {
      const levelingNewHeaders = newHeaders.filter((h) => String(h.mgubun ?? "") === "LEVELLING");
      levelingMerge.checked = levelingNewHeaders.length;

      if (levelingNewHeaders.length > 0) {
        const windowFrom = (() => {
          const d = new Date(date + "T00:00:00Z");
          d.setUTCDate(d.getUTCDate() - 3);
          return d.toISOString().slice(0, 10);
        })();
        const { data: recentLog, error: recentErr } = await supabase
          .from("dashboard_sync_log")
          .select("id, mjunp, mdate, work_type, dashboard_erp_id, company_name, product_name")
          .eq("work_type", "LEVELLING")
          .eq("seeded", false)
          .not("dashboard_erp_id", "is", null)
          .gte("mdate", windowFrom)
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
            const candIds = (recentLog || []).map((r: any) => Number(r.dashboard_erp_id));
            const placeholders = candIds.map(() => "?").join(",");
            const stateRes = await mysql.execute(`SELECT id, status, specification FROM erp_data WHERE id IN (${placeholders})`, candIds);
            const statusById = new Map<number, string>();
            const specById = new Map<number, string>();
            for (const r of (stateRes.rows || []) as any[]) {
              statusById.set(Number(r.id), String(r.status));
              specById.set(Number(r.id), String(r.specification ?? ""));
            }

            for (const h of levelingNewHeaders) {
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
              const productName = (item.spum ?? "").toString().trim();
              const companyName = String(h.mcomp ?? "").trim();
              const specification = (item.sspec ?? "").toString().trim();
              if (!productName) continue;

              const key = `${companyName}|${productName}`;
              const sameCoil = (candidatesByKey.get(key) || []).filter((c) => String(c.mjunp) !== String(h.mjunp));
              const openCandidates = sameCoil.filter((c) => {
                const erpId = Number(c.dashboard_erp_id);
                if (!statusById.has(erpId)) return false; // v10: 대시보드에 행이 없음(삭제됨) — 이어받을 대상 아님
                if (statusById.get(erpId) === "완료") return false;
                if (specification && specById.get(erpId) && specById.get(erpId) !== specification) return false;
                return true;
              });

              if (openCandidates.length === 0) continue; // 후보 없음 — 평소대로 신규 처리
              if (openCandidates.length > 1) {
                levelingMerge.ambiguous++;
                continue; // 모호함 — 안전하게 건드리지 않음
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

              if (!commit) continue; // dry-run — 후보만 보고, 실제 반영은 하지 않음

              try {
                // v10: 존재는 위 SELECT로 이미 확인됨 → affectedRows(=값이 바뀐 행 수)로 성공 여부를 판단하지 않는다.
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
      const [d1, d2] = await Promise.all([
        postAction(cookie, {
          submitType: "selectDetail1",
          sort_field: "",
          sort_asc: "",
          mid: "1001",
          selectMdate: String(h.mdate ?? date),
          selectMjunp: String(h.mjunp ?? ""),
        }),
        postAction(cookie, {
          submitType: "selectDetail2",
          sort_field: "",
          sort_asc: "",
          mid: "1001",
          selectMdate: String(h.mdate ?? date),
          selectMjunp: String(h.mjunp ?? ""),
        }),
      ]);
      const item = (d1.data || [])[0] || {};
      const sizeRows = (d2.data || []) as any[];
      const processRule = sizeRows.map((r) => r.sdesc).filter(Boolean).join(", ");
      const lengthParsed = parseLengthField(item.smeter);

      const matched = priceMap.get(priceKey(String(h.mjunp), String(h.mgubun)));

      return {
        _source: { mjunp: String(h.mjunp), mdate: h.mdate, workType: String(h.mgubun ?? "") },
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

    if (commit) {
      const commitT0 = performance.now();
      const postResults: any[] = [];
      const syncLogInserts: any[] = [];
      for (const p of payloads) {
        const res = await fetch(`${DASHBOARD_BASE}/api/erp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p.payload),
        });
        let body: any = null;
        try { body = await res.json(); } catch (_e) { /* ignore */ }
        postResults.push({ source: p._source, status: res.status, body });
        if (res.status >= 200 && res.status < 300) {
          syncLogInserts.push({
            mjunp: p._source.mjunp,
            mdate: p._source.mdate,
            board_date: p._source.mdate,
            work_type: p._source.workType,
            dashboard_erp_id: body?.id ?? null,
            company_name: p.payload.companyName,
            product_name: p.payload.productName,
            content_sig: contentSig(p.payload),
            seeded: false,
          });
        }
      }
      if (syncLogInserts.length > 0) {
        const { error } = await supabase.from("dashboard_sync_log").upsert(syncLogInserts, { onConflict: "mjunp,mdate,work_type" });
        if (error) throw new Error("dashboard_sync_log 기록 실패(등록 자체는 성공): " + error.message);
      }
      timings.commitMs = Math.round(performance.now() - commitT0);
      result.commitResults = postResults;
    }

    // v6/v8/v9/v10: 내용 변경 감지(content-drift) — 오늘 이미 동기화된 건의 그린ERP 현재 내용 서명을
    // 로그의 content_sig와 비교해 다르면 기존 행을 갱신한다.
    const contentSyncT0 = performance.now();
    const contentSync: Record<string, any> = { checked: 0, changed: 0, updated: 0, recreated: 0, errors: [] as any[] };
    try {
      const { data: syncedRows, error: syncedErr } = await supabase
        .from("dashboard_sync_log")
        .select("id, mjunp, mdate, work_type, dashboard_erp_id, company_name, product_name, content_sig")
        .eq("mdate", date)
        .eq("seeded", false)
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
        const [d1, d2] = await Promise.all([
          postAction(cookie, {
            submitType: "selectDetail1",
            sort_field: "",
            sort_asc: "",
            mid: "1001",
            selectMdate: String(h.mdate ?? date),
            selectMjunp: String(h.mjunp ?? ""),
          }),
          postAction(cookie, {
            submitType: "selectDetail2",
            sort_field: "",
            sort_asc: "",
            mid: "1001",
            selectMdate: String(h.mdate ?? date),
            selectMjunp: String(h.mjunp ?? ""),
          }),
        ]);
        const item = (d1.data || [])[0] || {};
        const sizeRows = (d2.data || []) as any[];
        const processRule = sizeRows.map((r) => r.sdesc).filter(Boolean).join(", ");
        const lengthParsed = parseLengthField(item.smeter);
        const currentProductName = (item.spum ?? "").toString().trim() || null;

        if (!currentProductName) return null; // 상세 조회 실패 등 — 건드리지 않음

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
        if (logRow.content_sig && logRow.content_sig === sig) return null; // 변동 없음

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
              // v9: 행 존재 여부를 먼저 SELECT로 확인 — affectedRows=0은 "행 없음"이 아니라 "변화 없음"일 수 있음.
              const existRes = await mysql.execute(`SELECT id FROM erp_data WHERE id = ?`, [c.logRow.dashboard_erp_id]);
              const rowExists = ((existRes.rows || []) as any[]).length > 0;
              if (rowExists) {
                // v10: 단가/금액은 값이 있을 때만 덮어씀(미러에 아직 없으면 기존 값 유지).
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
                // 기존 erp_data 행이 이미 지워진 경우(SELECT로 확인됨)에만 새로 등록하고 dashboard_erp_id를 새 id로 갱신.
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

    // v4/v5/v10: 미완료 작업 이월(rollover) — 그린ERP 기준으로 아직 완료되지 않은 것 중에서도,
    // 대시보드 자체에 이미 "완료"로 표시된 건(현장이 직접 끝낸 것)은 제외하고서만 이월한다.
    // v10: 대시보드에 행이 없는 건(missingOnBoard)은 SELECT 결과로 판단해 건너뛴다(affectedRows 미사용).
    const rolloverT0 = performance.now();
    const rollover: Record<string, any> = {
      checked: 0, stillOpen: 0, alreadyDoneOnBoard: 0, missingOnBoard: 0, updated: 0, skippedNoErpRow: 0, errors: [] as any[],
    };
    try {
      const { data: candidates, error: candErr } = await supabase
        .from("dashboard_sync_log")
        .select("id, mjunp, mdate, board_date, work_type, dashboard_erp_id, company_name, product_name")
        .eq("seeded", false)
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

        const erpOpen: any[] = [];
        for (const c of candidates) {
          const key = erpStatusKey(String(c.mdate), String(c.mjunp), String(c.work_type));
          const statusCode = statusMap.get(key);
          if (statusCode === undefined) {
            rollover.skippedNoErpRow++;
            continue;
          }
          if (statusCode === "3") {
            continue; // 그린ERP 작업완료 — 더 이상 신경 안 씀
          }
          erpOpen.push(c);
        }
        rollover.stillOpen = erpOpen.length;

        // v5: 그린ERP가 미완료라고 해도, 대시보드 자체(erp_data.status)에 이미 "완료"로 표시된 건은
        // 이월하지 않는다 — 둘 다 "아직 아니다"라고 할 때만 이월(AND 조건).
        if (erpOpen.length > 0) {
          let mysql: MysqlClient | null = null;
          try {
            mysql = await connectMysql();
            const boardStatus = await fetchBoardStatusByIds(mysql, erpOpen.map((c) => Number(c.dashboard_erp_id)));
            const alreadyDoneOnBoard: any[] = [];
            const missingOnBoard: any[] = [];
            for (const c of erpOpen) {
              const erpId = Number(c.dashboard_erp_id);
              if (!boardStatus.has(erpId)) {
                missingOnBoard.push(c); // 대시보드에서 삭제된 행 — 이월 불가
              } else if (boardStatus.get(erpId) === "완료") {
                alreadyDoneOnBoard.push(c);
              } else {
                toRoll.push(c);
              }
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
              // 날짜를 옮기지 않고, 오늘 다시 반복해서 체크하지 않도록 board_date만 갱신.
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
      }
      result.rolloverCandidates = toRoll.map((c) => ({ mjunp: c.mjunp, mdate: c.mdate, work_type: c.work_type, company_name: c.company_name, product_name: c.product_name }));
      rollover.ok = true;
    } catch (e) {
      rollover.ok = false;
      rollover.error = String((e as Error)?.message || e);
    }
    timings.rolloverMs = Math.round(performance.now() - rolloverT0);
    result.rollover = rollover;

    // v5: 되돌리기(reconcile) — 이미 오늘 날짜로 이월해놓았는데 대시보드 자체에서 보니 "완료"인 건은
    // 원래 날짜로 되돌린다.
    const reconcileT0 = performance.now();
    const reconcile: Record<string, any> = { checked: 0, reverted: 0, errors: [] as any[] };
    try {
      const { data: rolledToday, error: rolledErr } = await supabase
        .from("dashboard_sync_log")
        .select("id, mjunp, mdate, board_date, work_type, dashboard_erp_id")
        .eq("seeded", false)
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
            if (!commit) { reconcile.reverted++; continue; } // dry-run 미리보기
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
    } catch (_logErr) { /* 로그 실패는 무시 — 원래 오류를 그대로 반환 */ }

    return new Response(JSON.stringify(result, null, 1), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

// 알려진 한계:
// 1) (v10에서 해결) 단가/금액은 content_sig에 포함됨. 단, 미러(greenp_joborder_detail)에 단가가 아직 없으면 null로 간주.
// 2) dashboard_sync_log는 "우리가 보낸 것"만 추적함 — 대시보드에서 사람이 직접 지우거나 수정해도 이 로그는 그대로.
// 3) 내용 변경 감지는 "오늘(date) 이미 동기화된 건"만 대상. 매 사이클 상세 조회(selectDetail1/2)를 다시 호출.
// 4) 비고(메모)는 대시보드 /api/erp payload에 필드가 없어 동기화되지 않음.
// 5) 미완료 이월은 greenp_joborders(3일 롤링 미러) 기준 + 대시보드 자체 상태(AND). 이월 대상은 dashboard_sync_log에 dashboard_erp_id가 남아있는 건만.
// 6) LEVELLING "나머지 확정 이어받기"는 회사명+코일ID+규격 일치 + 미완료라는 휴리스틱이며, 후보가 2건 이상이면 모호함으로 보고 건드리지 않음(최근 3일).
