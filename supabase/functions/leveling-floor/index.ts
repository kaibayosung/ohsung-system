// leveling-floor (2026-10-15 신규) — 레벨링 현장 화면(가로 태블릿) 실데이터 API
// 읽기 전용. 레벨링 PLC(LEVELING_DATA)·작업지시서(erp_data, 대시보드 MariaDB)·언코일러 텐션 OCR(ai_tension_readings)을
// 코일 단위로 분석해 화면이 바로 그릴 수 있는 형태로 돌려준다.
//
//  GET ?mode=live                 오늘 작업 목록 + 현재 작업 실시간 상태 + 마감 전망 (화면이 15초마다 호출)
//  GET ?mode=day&date=YYYY-MM-DD  그날 작업 전체(상세 포함). 지난 날짜는 leveling_job_cache 에 저장해 재사용
//  GET ?mode=days&to=YYYY-MM-DD&n=21  날짜별 작업 건수(날짜 막대용)
//  GET ?mode=backfill&from=&to=   지난 날짜 분석 캐시 채우기(같은 두께 비교 이력용)
//
// 시간 규칙: LEVELING_DATA.TIMESTAMP 와 erp_data 시각은 이미 KST(벽시계)로 저장돼 있어 변환하지 않는다.
//            ai_tension_readings.captured_at 만 진짜 UTC 라서 +9h 해서 같은 축에 올린다.
//            코드 안의 모든 시각(ms)은 "KST 벽시계를 UTC 인 것처럼 담은 값"이다.
// 매수: MOVELENSV(행정 위치)가 100mm 넘게 떨어지는 순간 = 한 장 절단 완료. CYCLETM 으로 세면 3~4배 과대 집계라 쓰지 않는다.
// 비밀값: DB 접속 정보는 Edge Function 시크릿(LEVELER_DB_*)에서만 읽는다.
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "lf2";
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const JUNK = new Set(["0000000000", "111111111111", ""]);
const H = 3600000, MIN = 60000;
const END_OF_DAY = "17:40";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });
}
const kstNow = () => Date.now() + 9 * H;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const hm = (ms: number) => new Date(ms).toISOString().slice(11, 16);
const hms = (ms: number) => new Date(ms).toISOString().slice(11, 19);
const addDays = (d: string, n: number) => ymd(Date.parse(d + "T00:00:00Z") + n * 86400000);
const parseTs = (s: unknown) => (s ? Date.parse(String(s).replace(" ", "T") + "Z") : NaN);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r1 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
const r2 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(a: number[]): number | null { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; }
function sd(a: number[]): number | null { const m = mean(a); return m == null ? null : Math.sqrt(mean(a.map((v) => (v - m) ** 2))!); }
function mode(a: number[]): number | null {
  const m = new Map<number, number>(); let best: number | null = null, bc = 0;
  for (const v of a) { const k = Math.round(v * 10) / 10; const c = (m.get(k) || 0) + 1; m.set(k, c); if (c > bc) { bc = c; best = k; } }
  return best;
}
function pct(a: number[], p: number) { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]; }

// ---------- DB ----------
async function db(): Promise<Client> {
  const pass = Deno.env.get("LEVELER_DB_PASS") || "";
  if (!pass) throw new Error("LEVELER_DB_PASS 시크릿이 없습니다.");
  return await new Client().connect({
    hostname: Deno.env.get("LEVELER_DB_HOST") || "osungsteel.servehttp.com",
    port: parseInt(Deno.env.get("LEVELER_DB_PORT") || "33306", 10),
    username: Deno.env.get("LEVELER_DB_USER") || "ohsung",
    password: pass,
    db: Deno.env.get("LEVELER_DB_NAME") || "ohsung",
    timeout: 20000,
  });
}
function sb() { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); }

type Row = { t: number; c: string; b: number | null; r: number; cut: number; mv: number; ld: number; ss: number; cy: number; corr: number; acc: number; dec: number; slow: number; coef: number };

async function plcRows(cl: Client, date: string): Promise<Row[]> {
  const rows = await cl.query(
    `SELECT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d %H:%i:%s') ts, COIL_ID c, BOXIDX b, RUN r, CUTLENSET cut, MOVELENSV mv,
            INVERTERSPEEDPER ld, SPEEDSET ss, CYCLETM cy, CUTLENCORR corr, ACCTM acc, DECTM dece, SLOWLENSET slow, INVERTERSPEEDCOEFF coef
     FROM LEVELING_DATA WHERE TIMESTAMP >= ? AND TIMESTAMP < ? ORDER BY TIMESTAMP, ID`,
    [date + " 00:00:00", addDays(date, 1) + " 00:00:00"],
  );
  return (rows as any[]).map((x) => ({
    t: parseTs(x.ts), c: String(x.c ?? "").trim(), b: x.b == null ? null : num(x.b), r: num(x.r), cut: num(x.cut), mv: num(x.mv),
    ld: num(x.ld), ss: num(x.ss), cy: num(x.cy), corr: num(x.corr), acc: num(x.acc), dec: num(x.dece), slow: num(x.slow), coef: num(x.coef),
  }));
}
async function erpRows(cl: Client, from: string, to: string) {
  const rows = await cl.query(
    `SELECT id, product_name, company_name, specification, original_weight, used_weight, status,
            DATE_FORMAT(work_date,'%Y-%m-%d') wd, DATE_FORMAT(started_at,'%Y-%m-%d %H:%i:%s') sa, process_rule
     FROM erp_data WHERE work_type='LEVELLING' AND work_date BETWEEN ? AND ? ORDER BY id`,
    [from, to],
  );
  return dedupeErp(rows as any[]);
}
// 대시보드에 같은 작업지시서가 두 번 올라온 경우(준비 + 완료) 하나만 남긴다
function dedupeErp(rows: any[]) {
  const rank = (s: string) => (s === "완료" ? 3 : s === "진행" ? 2 : 1);
  const m = new Map<string, any>();
  for (const r of rows) {
    const k = [r.product_name, r.specification, r.original_weight, r.process_rule, r.wd].join("|");
    const o = m.get(k);
    if (!o || rank(r.status) > rank(o.status) || (rank(r.status) === rank(o.status) && r.sa && !o.sa)) m.set(k, r);
  }
  return [...m.values()].sort((a, b) => a.id - b.id);
}
async function tensionRows(date: string) {
  const fromUtc = new Date(Date.parse(date + "T00:00:00Z") - 9 * H).toISOString();
  const toUtc = new Date(Date.parse(date + "T00:00:00Z") + 15 * H).toISOString();
  const { data, error } = await sb().from("ai_tension_readings")
    .select("captured_at, output_percent, output_voltage, thickness_um, start_dia_mm, parse_ok")
    .gte("captured_at", fromUtc).lt("captured_at", toUtc).order("captured_at").range(0, 4999);
  if (error) return [];
  return (data || []).map((x: any) => ({
    t: Date.parse(x.captured_at) + 9 * H, out: x.output_percent == null ? null : Number(x.output_percent),
    v: x.output_voltage == null ? null : Number(x.output_voltage), thk: x.thickness_um == null ? null : Number(x.thickness_um),
    dia: x.start_dia_mm == null ? null : Number(x.start_dia_mm), ok: !!x.parse_ok && x.output_percent != null,
  }));
}

// ---------- 작업지시서 해석 ----------
const WCODE: Record<string, number> = { "3": 914, "4": 1219, "5": 1524, "6": 1829 };
function parseSpec(spec: string) {
  const p = String(spec || "").toUpperCase().split("X");
  const thk = parseFloat(p[0]);
  const wtok = (p[1] || "").trim();
  const wn = parseFloat(wtok);
  const code = WCODE[wtok] ? wtok : null;
  return { thk: Number.isFinite(thk) ? thk : null, wd: code ? WCODE[code] : (Number.isFinite(wn) && wn > 50 ? wn : null), wcode: code };
}
function parseRule(rule: string) {
  const boxes: Array<{ len: number; plan: number | null; rest?: boolean }> = [];
  const notes: string[] = [];
  for (const raw of String(rule || "").split(",")) {
    const s = raw.trim();
    if (!s) continue;
    const m = s.match(/^(\d+(?:\.\d+)?)\s*[Xx×]\s*(\d+(?:\.\d+)?)\s*(?:=\s*(.*))?$/);
    if (!m) { notes.push(s); continue; }
    const len = parseFloat(m[2]);
    const rest = (m[3] ?? "").trim();
    if (!rest) { boxes.push({ len, plan: null }); continue; }
    const remain = /나머지/.test(rest);
    const nums = rest.replace(/[^\d.]/g, " ").trim().split(/[\s.]+/).filter(Boolean).map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x) && x > 0);
    if (!nums.length) boxes.push({ len, plan: null, rest: remain });
    else for (const n of nums) boxes.push({ len, plan: n, rest: remain });
  }
  return { boxes, notes };
}

// ---------- 코일 분석 ----------
function analyzeCoil(rows: Row[], erp: any | null, readings: any[], hist: any, opts: { live: boolean; nowT: number; others?: string[] }) {
  const T0 = rows[0].t;
  const tm = (t: number) => r2((t - T0) / MIN)!;
  // 1) 매수: 행정 위치 리셋
  const sh: Array<{ t: number; len: number; box: number | null; ri: number }> = [];
  for (let i = 1; i < rows.length; i++) {
    const p = rows[i - 1], r = rows[i];
    if (p.mv - r.mv > 100 && p.cut >= 100 && p.cut < 20000) sh.push({ t: r.t, len: p.cut, box: p.b, ri: i });
  }
  const last = rows[rows.length - 1];
  const spec = parseSpec(erp?.specification || "");
  const kg = num(erp?.used_weight) || num(erp?.original_weight) || null;
  const rule = parseRule(erp?.process_rule || "");
  const base: any = {
    coil: rows[0].c, erpId: erp?.id ?? null, cu: erp?.company_name ?? null, specRaw: erp?.specification ?? null,
    thk: spec.thk, wd: spec.wd, wcode: spec.wcode, kg, erpStatus: erp?.status ?? null, notes: rule.notes.join(", "),
    planBoxes: rule.boxes, date: ymd(T0), st: hm(T0), stT: hms(T0),
  };
  if (!sh.length) {
    const dur = (last.t - T0) / MIN;
    return { ...base, noSheets: true, end: hm(last.t), dur: r1(dur), setup: r1(dur), runMin: 0, chg: 0, stopMin: 0, boxes: [], sPlc: 0, sPlan: null, L: 0, segs: [{ k: "set", a: 0, b: r2(dur), l0: 0, l1: 0 }], rd: [], flags: [{ k: "nosheet", lv: "w" }], j: "wn", byLen: [], aligned: false, chgN: 0,
      _rows: opts.live ? rows : undefined, _sh: opts.live ? [] : undefined, _gOf: opts.live ? new Map() : undefined, _cumAfter: opts.live ? [] : undefined, _gMed: opts.live ? [] : undefined };
  }
  // 2) 박스(묶음) 나누기: BOXIDX 를 2개 이상 쓰면 그대로, 아니면 절단길이가 바뀌는 곳에서 나눈다
  const boxVals = new Set(sh.filter((s) => s.box != null && s.box > 0).map((s) => s.box));
  const useBox = boxVals.size >= 2;
  type G = { key: number | null; sh: typeof sh };
  let groups: G[] = [];
  for (const s of sh) {
    const g = groups[groups.length - 1];
    const lastLen = g ? g.sh[g.sh.length - 1].len : 0;
    const isNew = !g || (useBox ? s.box !== g.key : Math.abs(s.len - lastLen) > 3);
    if (isNew) groups.push({ key: useBox ? s.box : null, sh: [s] }); else g.sh.push(s);
  }
  // 3장 미만 묶음(세팅 중 시험 절단 등)은 다음 묶음에 합친다(마지막이면 앞 묶음)
  if (groups.length > 1) {
    const out: G[] = [];
    let carry: typeof sh = [];
    groups.forEach((g, i) => {
      if (g.sh.length < 3 && i < groups.length - 1) { carry = carry.concat(g.sh); return; }
      if (g.sh.length < 3 && i === groups.length - 1 && out.length) { out[out.length - 1].sh = out[out.length - 1].sh.concat(carry, g.sh); carry = []; return; }
      out.push({ key: g.key, sh: carry.concat(g.sh) }); carry = [];
    });
    if (carry.length) { if (out.length) out[out.length - 1].sh = out[out.length - 1].sh.concat(carry); else out.push({ key: null, sh: carry }); }
    groups = out;
  }
  const gOf = new Map<number, number>(); // sheet index -> group index
  let si = 0; groups.forEach((g, gi) => g.sh.forEach(() => gOf.set(si++, gi)));
  const allSh = groups.flatMap((g) => g.sh);
  // 3) 장당 간격, 묶음별 대표 사이클
  const dts: number[] = allSh.map((s, k) => (k ? (s.t - allSh[k - 1].t) / 1000 : NaN));
  const gMed = groups.map((g, gi) => {
    const a: number[] = []; allSh.forEach((s, k) => { if (k && gOf.get(k) === gi && gOf.get(k - 1) === gi) a.push(dts[k]); });
    const m0 = median(a) || 12; return median(a.filter((x) => x <= Math.max(60, 3 * m0))) || m0;
  });
  const idle = (k: number) => k > 0 && dts[k] > Math.max(60, 3 * gMed[gOf.get(k)!]);
  // 4) 시간 구간: 세팅 → 가동 → (교체/정지) → …
  const cumAfter: number[] = []; let cum = 0; allSh.forEach((s) => { cum += s.len / 1000; cumAfter.push(cum); });
  const L = cum;
  const segs: any[] = [];
  const push = (k: string, a: number, b: number, l0: number, l1: number, box: number | null) => {
    if (b - a < 1000) return;
    segs.push({ k, a: tm(a), b: tm(b), l0: r1(l0), l1: r1(l1), box });
  };
  const firstStart = Math.max(T0, allSh[0].t - gMed[0] * 1000);
  push("set", T0, firstStart, 0, 0, null);
  let runStart = firstStart, runL0 = 0;
  for (let k = 1; k <= allSh.length; k++) {
    const end = k === allSh.length;
    const brk = end || idle(k) || gOf.get(k) !== gOf.get(k - 1);
    if (!brk) continue;
    const gi = gOf.get(k - 1)!;
    push("run", runStart, allSh[k - 1].t, runL0, cumAfter[k - 1], gi + 1);
    if (end) break;
    const nStart = Math.max(allSh[k - 1].t, allSh[k].t - gMed[gOf.get(k)!] * 1000);
    const kind = gOf.get(k) !== gi ? "chg" : "stop";
    if (nStart - allSh[k - 1].t >= 1000) push(kind, allSh[k - 1].t, nStart, cumAfter[k - 1], cumAfter[k - 1], gi + 1);
    else if (kind === "chg") segs.push({ k: "chg", a: tm(allSh[k - 1].t), b: tm(allSh[k - 1].t), l0: r1(cumAfter[k - 1]), l1: r1(cumAfter[k - 1]), box: gi + 1 });
    runStart = nStart; runL0 = cumAfter[k - 1];
  }
  const lastSheetT = allSh[allSh.length - 1].t;
  const running = opts.live;
  let Tend = lastSheetT;
  if (running) {
    Tend = Math.max(last.t, lastSheetT);
    if (Tend - lastSheetT > 90000) push("stop", lastSheetT, Tend, L, L, groups.length);
  }
  const sum = (k: string) => segs.filter((s) => s.k === k).reduce((a, s) => a + (s.b - s.a), 0);
  const dur = (Tend - T0) / MIN;
  // 5) 행 단위 지표(움직이는 행만): 부하
  const moving = rows.map((r, i) => i > 0 && Math.abs(r.mv - rows[i - 1].mv) > 3 && r.ld > 5);
  // 행 → 누적 길이 (그 시점까지 끝난 장 길이 합 + 현재 행정 위치)
  const rowCum: number[] = []; { let k = 0, c = 0; for (const r of rows) { while (k < allSh.length && allSh[k].t <= r.t) { c = cumAfter[k]; k++; } rowCum.push(c + Math.min(Math.max(r.mv, 0), r.cut > 100 ? r.cut : r.mv) / 1000); } }
  // 묶음 시간 범위
  const gRange = groups.map((g, gi) => {
    const firstK = allSh.indexOf(g.sh[0]);
    const a = firstK === 0 ? firstStart : Math.max(allSh[firstK - 1].t, g.sh[0].t - gMed[gi] * 1000);
    return { a, b: g.sh[g.sh.length - 1].t };
  });
  const boxes = groups.map((g, gi) => {
    const { a, b } = gRange[gi];
    const rs = rows.filter((r, i) => r.t >= a && r.t <= b);
    const mvRows = rows.filter((r, i) => moving[i] && r.t >= a && r.t <= b);
    const len = mode(g.sh.map((s) => s.len))!;
    const runMin = segs.filter((s) => s.k === "run" && s.box === gi + 1).reduce((x, s) => x + (s.b - s.a), 0);
    const cyc = gMed[gi];
    return {
      i: gi + 1, idx: g.key, len: r1(len), plc: g.sh.length, plan: null as number | null, cyc: r1(cyc), min: r1(runMin),
      ld: r1(mean(mvRows.map((r) => r.ld))), spd: r1(len / 1000 / cyc * 60), ss: mode(rs.map((r) => r.ss)), corr: mode(rs.map((r) => r.corr)),
      acc: mode(rs.map((r) => r.acc)), dec: mode(rs.map((r) => r.dec)), slow: mode(rs.map((r) => r.slow)), coef: mode(rs.map((r) => r.coef)),
      a: tm(a), b: tm(b), lenM: r1(g.sh.reduce((x, s) => x + s.len, 0) / 1000),
    };
  });
  // 6) 계획(작업내용)과 대조: 묶음 수·길이가 같으면 박스별, 아니면 절단길이별
  const pb = rule.boxes;
  // 박스 수·절단길이가 계획과 같으면 박스별로 맞춘다(진행 중이면 지금까지 끝난 박스까지만 비교)
  const aligned = pb.length > 0 && (running ? pb.length >= boxes.length : pb.length === boxes.length) && boxes.every((b, i) => pb[i] && Math.abs(pb[i].len - (b.len || 0)) <= 5);
  if (aligned) boxes.forEach((b, i) => { b.plan = pb[i].plan; });
  const byLen: any[] = [];
  {
    const lens = [...new Set([...pb.map((p) => Math.round(p.len)), ...boxes.map((b) => Math.round(b.len || 0))])];
    for (const l of lens) {
      const ps = pb.filter((p) => Math.abs(p.len - l) <= 5);
      const plc = boxes.filter((b) => Math.abs((b.len || 0) - l) <= 5).reduce((x, b) => x + b.plc, 0);
      if (byLen.some((x) => Math.abs(x.len - l) <= 5)) continue;
      byLen.push({ len: l, plan: ps.length && ps.every((p) => p.plan != null) ? ps.reduce((x, p) => x + (p.plan || 0), 0) : null, planBoxes: ps.length, plc });
    }
  }
  const sPlc = allSh.length;
  const sPlan = pb.length && pb.every((p) => p.plan != null) ? pb.reduce((x, p) => x + (p.plan || 0), 0) : null;
  // '나머지(n)' 박스는 수량이 추정치라 초과(불량 후보) 계산에서 뺀다
  if (aligned) boxes.forEach((b, i) => { (b as any).rest = !!pb[i].rest; });
  byLen.forEach((x) => { x.rest = pb.some((p) => p.rest && Math.abs(p.len - x.len) <= 5); });
  const def = aligned ? boxes.reduce((x, b) => x + (b.plan != null && !(b as any).rest ? Math.max(0, b.plc - b.plan) : 0), 0) : byLen.reduce((x, l) => x + (l.plan != null && !l.rest ? Math.max(0, l.plc - l.plan) : 0), 0);
  // 7) 길이 검증
  const Lphys = kg && spec.thk && spec.wd ? kg / (spec.thk / 1000 * spec.wd / 1000 * 7850) : null;
  // 8) 길이별 프로파일(100칸)
  const N = 100, Lp = Math.max(L, 0.001);
  const pld = Array(N).fill(0), pldn = Array(N).fill(0), pcy = Array(N).fill(0), pcyn = Array(N).fill(0);
  rows.forEach((r, i) => { if (!moving[i]) return; const bi = Math.min(N - 1, Math.floor(rowCum[i] / Lp * N)); pld[bi] += r.ld; pldn[bi]++; });
  allSh.forEach((s, k) => { if (!k || idle(k)) return; const bi = Math.min(N - 1, Math.floor(cumAfter[k] / Lp * N)); pcy[bi] += dts[k]; pcyn[bi]++; });
  const lenAtBucket = (bi: number) => (bi + 0.5) * Lp / N;
  const boxAtLen = (l: number) => { let c = 0; for (let gi = 0; gi < boxes.length; gi++) { c += boxes[gi].lenM || 0; if (l <= c + 1e-6) return gi; } return boxes.length - 1; };
  const prof = {
    x: Array.from({ length: N }, (_, i) => r1((i + 0.5) * Lp / N)),
    ld: pld.map((v, i) => (pldn[i] ? r1(v / pldn[i]) : null)),
    cyc: pcy.map((v, i) => (pcyn[i] ? r2(v / pcyn[i]) : null)),
    spd: pcy.map((v, i) => (pcyn[i] ? r1((boxes[boxAtLen(lenAtBucket(i))].len || 0) / 1000 / (v / pcyn[i]) * 60) : null)),
  };
  // 9) 시간별 속도(1분 단위): 설정 속도 / 실제 이송(앞뒤 3분 생산 길이 평균)
  const spdt: any = { m: [], set: [], act: [] };
  const durM = Math.ceil(dur);
  let rp = 0;
  for (let m = 0; m <= durM; m++) {
    const a = T0 + m * MIN, b = a + MIN;
    const rs: Row[] = []; while (rp < rows.length && rows[rp].t < a) rp++; for (let q = rp; q < rows.length && rows[q].t < b; q++) if (moving[q]) rs.push(rows[q]);
    const prod = allSh.filter((s) => s.t >= a - 1.5 * MIN && s.t < b + 0.5 * MIN).reduce((x, s) => x + s.len, 0) / 1000 / 3;
    spdt.m.push(m); spdt.set.push(rs.length ? mode(rs.map((r) => r.ss)) : 0); spdt.act.push(r1(prod));
  }
  // 10) 장당 사이클 분포
  const cycs = allSh.map((s, k) => (k && !idle(k) && gOf.get(k) === gOf.get(k - 1) ? dts[k] : NaN)).filter((x) => Number.isFinite(x) && x > 0);
  let hist14: any = null;
  if (cycs.length > 5) {
    const lo = pct(cycs, 0.02), hi = pct(cycs, 0.98), nb = 14, bw = Math.max(0.1, (hi - lo) / nb);
    const n = Array(nb).fill(0); cycs.forEach((v) => { if (v < lo || v > hi + 1e-9) return; n[Math.min(nb - 1, Math.floor((v - lo) / bw))]++; });
    hist14 = { lab: n.map((_, i) => r1(lo + bw * i)), n };
  }
  // 11) 텐션 OCR — 시간으로 이 코일에 붙이고, 시간→길이 보간
  const tl: Array<[number, number]> = [[firstStart, 0], ...allSh.map((s, k) => [s.t, cumAfter[k]] as [number, number])];
  const t2l = (t: number) => {
    if (t <= tl[0][0]) return 0; if (t >= tl[tl.length - 1][0]) return L;
    let lo = 0, hi = tl.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tl[m][0] <= t) lo = m; else hi = m; }
    const f = (t - tl[lo][0]) / ((tl[hi][0] - tl[lo][0]) || 1); return tl[lo][1] + (tl[hi][1] - tl[lo][1]) * f;
  };
  const rdIn = readings.filter((x) => x.t >= T0 - 2 * MIN && x.t <= Tend + 2 * MIN);
  const thkUm = spec.thk ? Math.round(spec.thk * 1000) : null;
  const rd = rdIn.map((x) => { const l = t2l(x.t); return { m: tm(x.t), hm: hm(x.t), l: r1(l), box: boxAtLen(l) + 1, out: x.out, v: x.v, thk: x.thk, dia: x.dia, ok: x.ok }; });
  const okRd = rdIn.filter((x) => x.ok);
  const ocrGaps: number[][] = [];
  { const pts = [firstStart, ...okRd.map((x) => x.t).filter((t) => t >= firstStart && t <= Tend), Tend];
    for (let i = 1; i < pts.length; i++) if (pts[i] - pts[i - 1] > 15 * MIN && rdIn.length) ocrGaps.push([tm(pts[i - 1])!, tm(pts[i])!]); }
  const thkMatch = okRd.filter((x) => thkUm && x.thk === thkUm).length;
  // 12) 평소(같은 두께 이력) 대비 이상 구간
  const ldVals = prof.ld.filter((v): v is number => v != null);
  const ldBase = median(ldVals); // 이상 구간은 이번 코일 자체 평소값 대비 국소 급등만 본다(두께·폭이 같아도 코일마다 기준이 달라서)
  const anom: number[][] = [];
  if (ldBase != null) {
    let s = -1; const thr = ldBase + 8;
    for (let i = 0; i <= N; i++) {
      const hot = i < N && prof.ld[i] != null && prof.ld[i]! > thr;
      if (hot && s < 0) s = i;
      if (!hot && s >= 0) { if (i - s >= 3 && i - s <= 30) anom.push([r1(s * Lp / N)!, r1(i * Lp / N)!]); s = -1; }
    }
  }
  // 13) 이벤트(속도 설정 변경)
  const ssChanges: any[] = [];
  { let prev: number | null = null; rows.forEach((r) => { if (r.ss <= 0) return; if (prev != null && Math.abs(r.ss - prev) >= 0.5 && ssChanges.length < 12) ssChanges.push({ m: tm(r.t), from: prev, to: r.ss }); prev = r.ss; }); }
  // 14) 판정
  // 판정: w=확인 필요(불량 후보·이상·데이터 불일치), i=참고(정지·부분 작업·계획 수량 차이·OCR 공백)
  const flags: any[] = [];
  if (!erp) flags.push({ k: "noerp", lv: "w" });
  if (def >= 2) flags.push({ k: "over", lv: "w", n: def, boxes: aligned ? boxes.filter((b) => b.plan != null && !(b as any).rest && b.plc > b.plan).map((b) => ({ i: b.i, d: b.plc - b.plan! })) : byLen.filter((x) => x.plan != null && !x.rest && x.plc > x.plan).map((x) => ({ len: x.len, d: x.plc - x.plan })) });
  const partial = !running && Lphys != null && L < Lphys * 0.9;
  if (partial) flags.push({ k: "partial", lv: "i", pct: Math.round(L / Lphys! * 100), others: (opts as any).others || [] });
  if (sPlan != null && sPlc < sPlan * 0.97 && !running && !partial) flags.push({ k: "under", lv: "i", n: sPlan - sPlc, lenOk: Lphys != null && Math.abs(L - Lphys) / Lphys <= 0.03 });
  const stopMin = sum("stop");
  if (stopMin >= 10) flags.push({ k: "stops", lv: "i", min: Math.round(stopMin), longest: Math.round(Math.max(0, ...segs.filter((x) => x.k === "stop").map((x) => x.b - x.a))) });
  if (anom.length) flags.push({ k: "anom", lv: "w", r: anom[0], d: r1(Math.max(...prof.ld.filter((v, i) => v != null && i >= anom[0][0] / Lp * N && i < anom[0][1] / Lp * N) as number[]) - ldBase!) });
  const gapMin = ocrGaps.reduce((x, g) => x + (g[1] - g[0]), 0);
  if (rdIn.length && gapMin >= 15) flags.push({ k: "ocr", lv: "i", min: Math.round(gapMin) });
  // 중량으로 나올 수 있는 길이보다 5% 넘게 길면: 같은 코일 번호로 여러 코일을 작업했거나 규격·중량 입력 오류
  if (Lphys && L > Lphys * 1.05 && !running) flags.push({ k: "len", lv: "w", d: r1((L - Lphys) / Lphys * 100) });
  const verdictFlags = flags.filter((f) => f.lv === "w");
  const tenOk = okRd.filter((x) => (x.out as number) >= 5).map((x) => x.out as number); // 0%대(정지 중 화면)는 통계에서 뺀다
  const tenProf: (number | null)[] = Array(10).fill(null);
  if (okRd.length >= 3 && L > 0) for (let i = 0; i < 10; i++) { const a = okRd.filter((x) => { if ((x.out as number) < 5) return false; const f = t2l(x.t) / L; return f >= i / 10 && f < (i + 1) / 10 + (i === 9 ? 0.01 : 0); }).map((x) => x.out as number); tenProf[i] = r1(median(a)); }
  const runMin = sum("run");
  return {
    ...base, end: hm(Tend), endT: hms(Tend), dur: r1(dur), setup: r1(sum("set")), runMin: r1(runMin), chg: r1(sum("chg")), stopMin: r1(stopMin),
    chgN: segs.filter((s) => s.k === "chg").length, boxes, aligned, byLen, sPlc, sPlan, def, L: r1(L), Lphys: r1(Lphys),
    cyc: r2(runMin * 60 / sPlc), load: r1(mean(rows.filter((_, i) => moving[i]).map((r) => r.ld))), segs, prof, spdt, cycHist: hist14,
    tl: tl.filter((_, i) => i % Math.max(1, Math.ceil(tl.length / 150)) === 0 || i === tl.length - 1).map(([t, l]) => [tm(t), r1(l)]),
    rd, ocrGaps, thkMatch, thkUm, rdOk: okRd.length, tenAvg: r1(mean(tenOk)), tenFirst: tenOk[0] ?? null, tenLast: tenOk[tenOk.length - 1] ?? null,
    tenDrops: tenOk.reduce((x, v, i) => x + (i && v < tenOk[i - 1] ? 1 : 0), 0), tenProf,
    anom, ldBase: r1(ldBase), ssChanges, flags, j: verdictFlags.length ? "wn" : "ok", useBox,
    spdSetMain: mode(rows.filter((_, i) => moving[i]).map((r) => r.ss)),
    _rows: running ? rows : undefined, _sh: running ? allSh : undefined, _gOf: running ? gOf : undefined, _cumAfter: running ? cumAfter : undefined, _gMed: running ? gMed : undefined,
  };
}

// 같은 두께 이력(캐시) 요약
function histFor(all: any[], thk: number | null, coil: string, date: string, wd?: number | null) {
  if (thk == null) return { n: 0 };
  const peers = all.filter((s) => s.thk != null && Math.abs(s.thk - thk) <= 0.06 && !(s.coil === coil && s.date === date) && s.sPlc > 10
    && !(wd && s.wd && Math.abs(s.wd - wd) / wd > 0.15) && !(s.flags || []).some((f: any) => f.k === "len" || f.k === "partial" || f.k === "noerp"));
  const lds = peers.map((p) => p.load).filter((v: any) => v != null);
  const tp: (number | null)[] = Array(10).fill(null);
  for (let i = 0; i < 10; i++) { const a = peers.map((p) => p.tenProf?.[i]).filter((v: any) => v != null); tp[i] = a.length ? r1(median(a)) : null; }
  return {
    n: peers.length, ldMean: r1(mean(lds)), ldSd: r1(sd(lds)), tenProf: tp,
    avgDur: r1(mean(peers.map((p) => p.dur))), avgPerTon: r1(mean(peers.filter((p) => p.kg).map((p) => p.dur / p.kg * 1000))),
    avgCyc: r2(mean(peers.map((p) => p.cyc).filter((v: any) => v))), avgLoad: r1(mean(lds)), avgStop: r1(mean(peers.map((p) => p.stopMin))),
    perTons: peers.filter((p) => p.kg).map((p) => p.dur / p.kg * 1000),
  };
}
function cmpOf(job: any, h: any) {
  if (!h || !h.n) return { n: 0 };
  const perTon = job.kg ? job.dur / job.kg * 1000 : null;
  const arr = [...(h.perTons || [])];
  const rank = perTon != null ? arr.filter((v: number) => v < perTon).length + 1 : null;
  return { n: h.n, avgDur: h.avgDur, avgPerTon: h.avgPerTon, perTon: r1(perTon), rank, tot: arr.length + 1, avgCyc: h.avgCyc, avgLoad: h.avgLoad, avgStop: h.avgStop };
}
function summaryOf(j: any) {
  return { date: j.date, coil: j.coil, cu: j.cu, thk: j.thk, wd: j.wd, flags: (j.flags || []).map((f: any) => ({ k: f.k })), kg: j.kg, dur: j.dur, runMin: j.runMin, stopMin: j.stopMin, chg: j.chg, setup: j.setup, sPlc: j.sPlc, sPlan: j.sPlan, L: j.L, cyc: j.cyc, load: j.load, tenProf: j.tenProf, j: j.j };
}
function strip(j: any) { const o = { ...j }; delete o._rows; delete o._sh; delete o._gOf; delete o._cumAfter; delete o._gMed; return o; }

// ERP 행과 PLC 코일 짝짓기
function matchErp(erps: any[], coil: string, date: string, used: Set<number>) {
  const c = erps.filter((e) => String(e.product_name || "").trim() === coil && !used.has(e.id));
  if (!c.length) return null;
  const same = c.filter((e) => e.wd === date);
  const pick = (same.length ? same : c.filter((e) => e.wd <= date).sort((a, b) => (a.wd < b.wd ? 1 : -1)))[0] || c[0];
  used.add(pick.id); return pick;
}

async function loadSummaries() {
  const { data } = await sb().from("leveling_job_cache").select("summary").eq("version", VERSION).range(0, 4999);
  return (data || []).map((x: any) => x.summary);
}

// 하루 분석(캐시 사용)
async function analyzeDay(cl: Client | null, date: string, today: string, summaries: any[], opts: { liveCoil?: string | null; force?: boolean; until?: number } = {}) {
  const past = date < today;
  const s = sb();
  if (past && !opts.force) {
    const { data: day } = await s.from("leveling_day_cache").select("version, extra").eq("work_date", date).maybeSingle();
    if (day && day.version === VERSION) {
      const { data: jobs } = await s.from("leveling_job_cache").select("job").eq("work_date", date).eq("version", VERSION);
      const js = (jobs || []).map((x: any) => x.job).sort((a: any, b: any) => (a.stT < b.stT ? -1 : 1));
      js.forEach((j: any) => { j.cmp = cmpOf(j, histFor(summaries, j.thk, j.coil, j.date, j.wd)); });
      return { date, jobs: js, extra: day.extra || {}, cached: true };
    }
  }
  const client = cl!;
  let [rows, erps, readings] = await Promise.all([plcRows(client, date), erpRows(client, addDays(date, -30), addDays(date, 1)), tensionRows(date)]);
  if (opts.until) { const u = opts.until; rows = rows.filter((r) => r.t <= u); readings = readings.filter((x: any) => x.t <= u); }
  const byCoil = new Map<string, Row[]>();
  const unassigned: Row[] = [];
  for (const r of rows) { if (JUNK.has(r.c) || r.c.length < 2) { unassigned.push(r); continue; } if (!byCoil.has(r.c)) byCoil.set(r.c, []); byCoil.get(r.c)!.push(r); }
  const used = new Set<number>();
  const jobs: any[] = [];
  for (const [coil, rs] of byCoil) {
    if (rs.length < 30) continue; // 코일 번호만 잠깐 입력된 경우
    const erp = matchErp(erps, coil, date, used);
    const sp0 = parseSpec(erp?.specification || "");
    const h = histFor(summaries, sp0.thk, coil, date, sp0.wd);
    const others = summaries.filter((x) => x.coil === coil && x.date !== date && Math.abs(Date.parse(x.date) - Date.parse(date)) <= 14 * 86400000).map((x) => x.date).sort();
    const j = analyzeCoil(rs, erp, readings, h, { live: opts.liveCoil === coil, nowT: kstNow(), others });
    j.cmp = cmpOf(j, h); j.hist = { n: h.n, ldMean: h.ldMean, ldSd: h.ldSd, tenProf: h.tenProf };
    jobs.push(j);
  }
  jobs.sort((a, b) => (a.stT < b.stT ? -1 : 1));
  // 코일 번호 없이 가동한 기록(매수만)
  let unSheets = 0; for (let i = 1; i < unassigned.length; i++) { const p = unassigned[i - 1], r = unassigned[i]; if (r.t - p.t < 60000 && p.mv - r.mv > 100 && p.cut >= 100) unSheets++; }
  const extra = { unassignedSheets: unSheets, plcRows: rows.length, lastT: rows.length ? hms(rows[rows.length - 1].t) : null };
  if (past) {
    const up = jobs.map((j) => ({ work_date: date, coil_id: j.coil, version: VERSION, thk: j.thk, summary: summaryOf(j), job: strip(j), computed_at: new Date().toISOString() }));
    await s.from("leveling_job_cache").delete().eq("work_date", date);
    if (up.length) await s.from("leveling_job_cache").upsert(up);
    await s.from("leveling_day_cache").upsert({ work_date: date, version: VERSION, n: jobs.length, extra, computed_at: new Date().toISOString() });
  }
  return { date, jobs, extra, erps, readings, rows, cached: false };
}

function liveState(job: any, readings: any[], nowT: number) {
  const rows: Row[] = job._rows, sh = job._sh, gOf: Map<number, number> = job._gOf, cumAfter: number[] = job._cumAfter;
  const last = rows[rows.length - 1];
  let gi = sh.length ? gOf.get(sh.length - 1)! : 0;
  let box = job.boxes[gi] || null;
  let inBox = sh.filter((_: any, k: number) => gOf.get(k) === gi).length;
  // 작업자가 PLC 박스 번호를 다음으로 넘겼는데 아직 첫 장을 안 잘랐으면 '다음 박스 0장'으로 보여준다
  const switched = job.useBox && last.b != null && last.b > 0 && box && box.idx != null && last.b !== box.idx;
  if (switched) { gi = gi + 1; inBox = 0; box = { len: last.cut, plan: job.planBoxes?.[gi]?.plan ?? null, cyc: box.cyc, spd: box.spd, ld: box.ld }; }
  const recent: number[] = []; for (let k = sh.length - 1; k > 0 && recent.length < 10; k--) { const dt = (sh[k].t - sh[k - 1].t) / 1000; if (gOf.get(k) === gi && dt < 60) recent.push(dt); }
  const cycNow = median(recent) || job._gMed?.[gi] || null;
  const mvRecent = rows.filter((r, i) => i > 0 && r.t >= last.t - 90000 && Math.abs(r.mv - rows[i - 1].mv) > 3 && r.ld > 5);
  const loadNow = mean(mvRecent.map((r) => r.ld));
  const moving = mvRecent.length > 0 && last.t >= nowT - 60000;
  const rdOk = readings.filter((x) => x.ok && x.t <= nowT && x.t >= rows[0].t - 2 * MIN);
  const lastRd = rdOk[rdOk.length - 1] || null;
  const L = job.L || 0;
  const curLen = box?.len || last.cut || 0;
  // 남은 매수: 계획이 있으면 계획 기준, 없으면 중량으로 계산한 이론 길이 기준
  let remainSheets: number | null = null, planTotal = job.sPlan;
  if (planTotal != null) remainSheets = Math.max(0, planTotal - job.sPlc);
  else if (job.Lphys && curLen) remainSheets = Math.max(0, Math.round((job.Lphys - L) * 1000 / curLen));
  const remainBoxes = job.aligned ? Math.max(0, job.planBoxes.length - (gi + 1)) : Math.max(0, (job.planBoxes?.length || 0) - (gi + 1));
  const avgChg = job.chgN ? job.chg / job.chgN : 3;
  const remainMin = remainSheets != null && cycNow ? remainSheets * cycNow / 60 + remainBoxes * Math.max(2, avgChg) : null;
  const Lr = job.Lphys ? Math.max(0, job.Lphys - L) : null;
  const dia = Lr != null && job.thk ? Math.round(Math.sqrt(508 * 508 + 4 * Lr * 1000 * job.thk / Math.PI)) : null;
  const dia0 = job.Lphys && job.thk ? Math.round(Math.sqrt(508 * 508 + 4 * job.Lphys * 1000 * job.thk / Math.PI)) : null;
  return {
    box: gi + 1, boxPlan: box?.plan ?? (job.aligned ? job.planBoxes?.[gi]?.plan ?? null : null), s: inBox, done: job.sPlc, pos: r1(last.mv), cutNow: r1(last.cut), strokeT: r1(last.cy),
    load: r1(loadNow), moving, ss: last.ss, cycNow: r1(cycNow), ppm: cycNow ? r2(60 / cycNow) : null, feed: cycNow && curLen ? r1(curLen / 1000 / cycNow * 60) : null,
    corr: last.corr, acc: last.acc, dec: last.dec, slow: last.slow, coef: last.coef, run: last.r, idx: last.b,
    lastRd: lastRd ? { hm: hm(lastRd.t), out: lastRd.out, v: lastRd.v, thk: lastRd.thk, dia: lastRd.dia, ageMin: r1((nowT - lastRd.t) / MIN) } : null,
    remainSheets, remainMin: r1(remainMin), endEst: remainMin != null ? hm(nowT + remainMin * MIN) : null, planTotal, dia, dia0,
    lastRow: hms(last.t), idleSec: Math.round((nowT - (sh.length ? sh[sh.length - 1].t : rows[0].t)) / 1000),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "live";
  // asof=YYYY-MM-DD HH:MM:SS 를 주면 그 시각 기준으로 다시 재생(점검·시연용, 캐시 안 씀)
  const asof = url.searchParams.get("asof");
  const nowT = asof ? parseTs(asof) : kstNow();
  const today = ymd(nowT);
  let cl: Client | null = null;
  try {
    if (mode === "days") {
      const to = url.searchParams.get("to") || today;
      const n = Math.min(90, Math.max(1, parseInt(url.searchParams.get("n") || "21", 10)));
      const from = addDays(to, -(n - 1));
      cl = await db();
      const rows = await cl.query(
        `SELECT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d') d, COIL_ID c, COUNT(*) n FROM LEVELING_DATA
         WHERE TIMESTAMP >= ? AND TIMESTAMP < ? GROUP BY d, c`, [from + " 00:00:00", addDays(to, 1) + " 00:00:00"]);
      const m: Record<string, number> = {};
      for (const r of rows as any[]) { const c = String(r.c ?? "").trim(); if (JUNK.has(c) || c.length < 2 || num(r.n) < 30) continue; m[r.d] = (m[r.d] || 0) + 1; }
      const days = []; for (let i = 0; i < n; i++) { const d = addDays(from, i); days.push({ date: d, n: m[d] || 0 }); }
      return json({ ok: true, today, days });
    }
    if (mode === "backfill") {
      const from = url.searchParams.get("from") || addDays(today, -60);
      const to = url.searchParams.get("to") || addDays(today, -1);
      cl = await db();
      const rows = await cl.query(`SELECT DISTINCT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d') d FROM LEVELING_DATA WHERE TIMESTAMP >= ? AND TIMESTAMP < ? ORDER BY d`, [from + " 00:00:00", addDays(to, 1) + " 00:00:00"]);
      const done: any[] = [];
      let summaries = await loadSummaries();
      for (const r of rows as any[]) {
        if (r.d >= today) continue;
        const res = await analyzeDay(cl, r.d, today, summaries, { force: url.searchParams.get("force") === "true" });
        done.push({ date: r.d, jobs: res.jobs.length, cached: res.cached });
        summaries = await loadSummaries();
      }
      return json({ ok: true, from, to, done });
    }
    const summaries = await loadSummaries();
    if (mode === "day") {
      const date = url.searchParams.get("date") || today;
      if (date < today) {
        const { data: day } = await sb().from("leveling_day_cache").select("version").eq("work_date", date).maybeSingle();
        if (!day || day.version !== VERSION || url.searchParams.get("force") === "true") cl = await db();
      } else cl = await db();
      const res = await analyzeDay(cl, date, today, summaries, { force: url.searchParams.get("force") === "true" });
      return json({ ok: true, version: VERSION, today, now: hms(nowT), date, jobs: res.jobs.map(strip), extra: res.extra, cached: res.cached });
    }
    // ---- live ----
    cl = await db();
    const lastAll = asof
      ? (await cl.query(`SELECT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d %H:%i:%s') ts, COIL_ID c, RUN r FROM LEVELING_DATA WHERE TIMESTAMP <= ? ORDER BY TIMESTAMP DESC LIMIT 1`, [asof]) as any[])[0]
      : (await cl.query(`SELECT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d %H:%i:%s') ts, COIL_ID c, RUN r FROM LEVELING_DATA ORDER BY ID DESC LIMIT 1`) as any[])[0];
    const lastT = lastAll ? parseTs(lastAll.ts) : NaN;
    const online = Number.isFinite(lastT) && nowT - lastT < 5 * MIN;
    const lastCoil = lastAll ? String(lastAll.c ?? "").trim() : "";
    const liveCoil = online && !JUNK.has(lastCoil) && ymd(lastT) === today ? lastCoil : null;
    const res = await analyzeDay(cl, today, today, summaries, { liveCoil, until: asof ? nowT : undefined });
    const jobs = res.jobs;
    const cur = liveCoil ? jobs.find((j) => j.coil === liveCoil) || null : null;
    const live = cur ? liveState(cur, res.readings || [], nowT) : null;
    // 오늘 작업지시서 중 아직 PLC 기록이 없는 것 = 대기
    const erpsToday = (res.erps || []).filter((e: any) => e.wd === today);
    const usedIds = new Set(jobs.map((j) => j.erpId).filter(Boolean));
    const plcCoils = new Set(jobs.map((j) => j.coil));
    const waiting = erpsToday.filter((e: any) => !usedIds.has(e.id) && !plcCoils.has(String(e.product_name || "").trim()) && e.status !== "완료").map((e: any) => {
      const sp = parseSpec(e.specification), rule = parseRule(e.process_rule || "");
      const kg = num(e.used_weight) || num(e.original_weight) || null;
      const h = histFor(summaries, sp.thk, "", "", sp.wd);
      const allPerTon = summaries.filter((s) => s.kg && s.sPlc > 10).map((s) => s.dur / s.kg * 1000);
      const perTon = h.n >= 2 && h.avgPerTon ? h.avgPerTon : median(allPerTon) || 20;
      return { erpId: e.id, coil: String(e.product_name || ""), cu: e.company_name, specRaw: e.specification, thk: sp.thk, wd: sp.wd, wcode: sp.wcode, kg, notes: rule.notes.join(", "), planBoxes: rule.boxes, sPlan: rule.boxes.every((b) => b.plan != null) && rule.boxes.length ? rule.boxes.reduce((x, b) => x + (b.plan || 0), 0) : null, estMin: kg ? r1(perTon * kg / 1000) : null, erpStatus: e.status };
    });
    // 마감 전망
    let tc = cur && live?.remainMin != null ? nowT + live.remainMin * MIN : nowT;
    const eod = Date.parse(today + "T" + END_OF_DAY + ":00Z");
    waiting.forEach((w: any) => { const s = tc + 8 * MIN, e = s + (w.estMin || 60) * MIN; w.estStart = hm(s); w.estEnd = hm(e); w.late = e > eod; tc = e; });
    const doneErpNoPlc = erpsToday.filter((e: any) => !usedIds.has(e.id) && e.status === "완료" && !plcCoils.has(String(e.product_name || "").trim())).length;
    return json({
      ok: true, version: VERSION, today, now: hms(nowT), asof: asof || null, online, lastRow: lastAll ? hms(lastT) : null, lastCoil: lastCoil || null,
      coilSelected: online ? !JUNK.has(lastCoil) : null, liveCoil, jobs: jobs.map(strip), live, waiting, doneErpNoPlc, extra: res.extra,
    });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  } finally {
    if (cl) { try { await cl.close(); } catch (_e) { /* ignore */ } }
  }
});
