// leveling-status v6 (2026-11-19) — 레벨러 코일 품질 화면 속도 개선
//  - 응답 캐시(leveling_view_cache): 지난 날짜는 바로 캐시로 응답하고 10분 넘었으면 뒤에서 새로 계산,
//    오늘은 목록 60초·상세는 캐시 응답 후 60초 넘었으면 뒤에서 새로 계산.
//  - 목록: 코일마다 LEVELING_DATA 전체를 훑던 질의(코일 수+1번)를 하루치 1번으로. 나머지 질의는 동시에.
//  - 상세: 박스마다 2번씩 보내던 질의를 코일 하루치 2번으로 받아 박스별 계산. 질의 동시 실행(연결 4개).
//  - 목록을 새로 계산하면 끝난 코일의 상세·품질을 미리 계산해 둠(처음 누를 때도 빠르게).
//  - PLC 행(LEVELING_DATA)은 Supabase 거울(lvmirror.ts)에서 읽음 — 공장 인터넷 업로드 절약.
//  - nocache=1 이면 캐시를 쓰지 않음(점검용).
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";
import { mirrorDayRows, mirrorStats } from "./lvmirror.ts";
declare const EdgeRuntime: any;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (b: unknown, s = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const tms = (s: unknown) => (s ? Date.parse(String(s).replace(" ", "T") + "Z") : NaN);
const kstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const hhmm = (ms: number) => { const d = new Date(ms); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };
const r1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);

async function db(): Promise<Client> {
  const pass = Deno.env.get("LEVELER_DB_PASS") || ""; if (!pass) throw new Error("LEVELER_DB_PASS secret");
  return await new Client().connect({
    hostname: Deno.env.get("LEVELER_DB_HOST") || "osungsteel.servehttp.com",
    port: parseInt(Deno.env.get("LEVELER_DB_PORT") || "33306", 10),
    username: Deno.env.get("LEVELER_DB_USER") || "ohsung",
    password: pass, db: Deno.env.get("LEVELER_DB_NAME") || "ohsung", timeout: 20000, poolSize: 4,
  });
}
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SBH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
async function sb(path: string): Promise<any[]> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SBH, signal: AbortSignal.timeout(12000) });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}
function parseSpec(s: string) { const m = String(s || "").toUpperCase().replace(/\s/g, "").match(/^([\d.]+)X(\d+)/); return { thk: m ? num(m[1]) : null, wd: m ? num(m[2]) : null }; }

function buildBoxes(rows: Array<{ t: number; b: number | null; cut: number; mv: number }>) {
  const sh: Array<{ t: number; len: number; box: number | null }> = [];
  for (let i = 1; i < rows.length; i++) { const p = rows[i - 1], r = rows[i]; if (p.mv - r.mv > 100 && p.cut >= 100 && p.cut < 20000) sh.push({ t: r.t, len: p.cut, box: p.b }); }
  if (!sh.length) return { groups: [] as Array<{ key: number | null; cut: number; sheets: number[] }> };
  const boxVals = new Set(sh.filter((s) => s.box != null && s.box > 0).map((s) => s.box)); const useBox = boxVals.size >= 2;
  const groups: Array<{ key: number | null; cut: number; sheets: number[] }> = []; let g: any = null, lastLen = 0;
  for (const s of sh) { const isNew = !g || (useBox ? s.box !== g.key : Math.abs(s.len - lastLen) > 3); if (isNew) { g = { key: useBox ? s.box : null, cut: s.len, sheets: [] }; groups.push(g); } g.sheets.push(s.t); lastLen = s.len; }
  return { groups };
}

// ───────── 캐시 ─────────
const CT = "leveling_view_cache";
async function cacheGet(k: string) { const r = await sb(`${CT}?k=eq.${encodeURIComponent(k)}&select=body,created_at,refreshing_at`); return r[0] || null; }
async function cachePut(k: string, body: unknown) {
  try { await fetch(`${SB_URL}/rest/v1/${CT}?on_conflict=k`, { method: "POST", headers: { ...SBH, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ k, body, created_at: new Date().toISOString(), refreshing_at: null }), signal: AbortSignal.timeout(12000) }); } catch { /* 무시 */ }
}
async function cacheMark(k: string) {
  try { await fetch(`${SB_URL}/rest/v1/${CT}?k=eq.${encodeURIComponent(k)}`, { method: "PATCH", headers: { ...SBH, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ refreshing_at: new Date().toISOString() }), signal: AbortSignal.timeout(8000) }); } catch { /* 무시 */ }
}
function bg(p: Promise<unknown>) { try { EdgeRuntime.waitUntil(p.catch(() => {})); } catch { p.catch(() => {}); } }

async function compute(q: URLSearchParams): Promise<{ status: number; body: any }> {
  const mode = q.get("mode") || "list";
  const date = (q.get("date") || kstToday()).slice(0, 10);
  const d0 = date + " 00:00:00", d1 = addDays(date, 1) + " 00:00:00";

  let cl: Client | null = null;
  try {
    cl = await db();
    const c = cl;

    if (mode === "list") {
      const [dayRows, jobs] = await Promise.all([
        mirrorDayRows(c, date),   // PLC 행은 Supabase 거울에서(공장 회선 절약)
        sb(`leveler_jobs?work_date=eq.${date}&select=product_name,company_name,specification,original_weight,length,unit_price,amount,status,process_rule`),
      ]);
      const allRows = dayRows.filter((x: any) => x.c != null && String(x.c).trim() !== "" && !String(x.c).startsWith("0000"));
      // 코일별로 나눔 (시간순 유지)
      const byCoil = new Map<string, { rows: any[]; t0s: string; t1s: string; n: number }>();
      for (const x of allRows) {
        const k = String(x.c).trim(); let o = byCoil.get(k);
        if (!o) { o = { rows: [], t0s: x.ts, t1s: x.ts, n: 0 }; byCoil.set(k, o); }
        o.rows.push({ t: tms(x.ts), b: x.b == null ? null : num(x.b), cut: num(x.cut) || 0, mv: num(x.mv) || 0 });
        if (x.ts < o.t0s) o.t0s = x.ts; if (x.ts > o.t1s) o.t1s = x.ts; o.n++;
      }
      const plc = [...byCoil.entries()].map(([coil, o]) => ({ coil, st: o.t0s.slice(11, 16), en: o.t1s.slice(11, 16), t0s: o.t0s, t1s: o.t1s, n: o.n, rows: o.rows }))
        .sort((a, b) => (a.t0s < b.t0s ? -1 : a.t0s > b.t0s ? 1 : 0));
      const nowKSTms = Date.parse(new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 19) + "Z");
      const coils = plc.map((r) => r.coil);

      const sheetsByCoil = new Map<string, { sheets: number; boxes: number; cut: number | null }>();
      for (const p of plc) {
        const { groups } = buildBoxes(p.rows);
        sheetsByCoil.set(p.coil, { sheets: groups.reduce((a, g) => a + g.sheets.length, 0), boxes: groups.length, cut: groups[0]?.cut ?? null });
      }

      const flatMap = new Map<string, { warpMax: number | null }>();
      const defMap = new Map<string, { surf: number; flat: number }>();
      if (coils.length) {
        const ph = coils.map(() => "?").join(",");
        const [fl, det] = await Promise.all([
          c.query(`SELECT coil_id coil, ROUND(MAX(score),1) warpMax FROM inference_score_log WHERE camera_id=2 AND captured_at>=? AND captured_at<? AND coil_id IN (${ph}) GROUP BY coil_id`, [d0, d1, ...coils]) as Promise<any[]>,
          c.query(`SELECT coil_id coil, camera_id cam, COUNT(DISTINCT ai_alert_id) n FROM detection_alert WHERE captured_at>=? AND captured_at<? AND coil_id IN (${ph}) GROUP BY coil_id, camera_id`, [d0, d1, ...coils]) as Promise<any[]>,
        ]);
        for (const r of fl) { flatMap.set(String(r.coil).trim(), { warpMax: num(r.warpMax) }); }
        for (const r of det) { const k = String(r.coil).trim(), o = defMap.get(k) || { surf: 0, flat: 0 }; if (num(r.cam) === 2) o.flat += num(r.n) || 0; else o.surf += num(r.n) || 0; defMap.set(k, o); }
      }

      const erp = new Map<string, any>();
      for (const j of jobs) { const k = String(j.product_name || "").trim(); if (!k) continue; const o = erp.get(k) || { company: j.company_name, spec: j.specification, weight: 0, amount: 0, unit: num(j.unit_price), status: j.status }; o.weight += num(j.original_weight) || 0; o.amount += num(j.amount) || 0; if (!o.spec) o.spec = j.specification; erp.set(k, o); }

      const done: any[] = []; let running: any = null;
      for (const r of plc) {
        const cc = r.coil; const sc = sheetsByCoil.get(cc)!; const e = erp.get(cc) || {}; const fm = flatMap.get(cc) || {}; const dm = defMap.get(cc) || { surf: 0, flat: 0 };
        const sp = parseSpec(e.spec || "");
        const t0 = tms(r.t0s), t1 = tms(r.t1s);
        const durMin = Math.round((t1 - t0) / 60000);
        const row = { coil: cc, company: e.company ?? null, spec: e.spec ?? null, thk: sp.thk, start: r.st, end: r.en, durMin,
          sheets: sc.sheets, boxes: sc.boxes, cut: sc.cut, weight: e.weight || null, unit: e.unit ?? null, amount: e.amount || null,
          status: e.status ?? null, warpMax: (fm as any).warpMax ?? null, flatDef: dm.flat, surf: dm.surf };
        const active = date === kstToday() && (nowKSTms - t1) < 900000;
        if (active && !running) {
          let planned: number | null = null;
          if (sp.thk && sp.wd && e.weight && sc.cut) { const lenM = e.weight / ((sp.thk / 1000) * (sp.wd / 1000) * 7850); planned = Math.round(lenM * 1000 / sc.cut); if (planned < sc.sheets || planned > sc.sheets * 10) planned = null; }
          running = { ...row, planned, pct: planned ? Math.min(99, Math.round(sc.sheets / planned * 100)) : null, curBox: sc.boxes };
        } else { done.push(row); }
      }

      const waiting = jobs
        .filter((j: any) => { const st = String(j.status || ""); return st !== "완료" && !coils.includes(String(j.product_name || "").trim()); })
        .reduce((acc: any[], j: any) => { const k = String(j.product_name || "").trim(); if (acc.find((x) => x.coil === k)) return acc; acc.push({ coil: k, company: j.company_name, spec: j.specification, weight: num(j.original_weight), unit: num(j.unit_price), status: j.status }); return acc; }, [])
        .slice(0, 20);

      return { status: 200, body: { ok: true, date, running, done, waiting, _mirror: mirrorStats[date] ?? null } };
    }

    if (mode === "detail") {
      const coil = (q.get("coil") || "").trim(); if (!coil) return { status: 400, body: { ok: false, error: "coil" } };
      let wdate = date; if (!q.get("date")) { const w = (await c.query(`SELECT DATE_FORMAT(MAX(TIMESTAMP),'%Y-%m-%d') d FROM LEVELING_DATA WHERE COIL_ID=?`, [coil])) as any[]; if (w[0]?.d) wdate = w[0].d; }
      const w0 = wdate + " 00:00:00", w1 = addDays(wdate, 1) + " 00:00:00";
      const dUtc0 = new Date(Date.parse(wdate + "T00:00:00+09:00")).toISOString();
      const dUtc1 = new Date(Date.parse(addDays(wdate, 1) + "T00:00:00+09:00")).toISOString();

      // 질의 동시 실행: PLC 행 / 평탄 점수(코일 하루치) / 결함(코일 하루치) / 텐션 / ERP
      const [rawRows, infRaw, detRaw, ten, jobs] = await Promise.all([
        mirrorDayRows(c, wdate).then((rs) => rs.filter((x: any) => String(x.c ?? "").trim().toUpperCase() === coil.toUpperCase())),
        c.query(`SELECT DATE_FORMAT(captured_at,'%Y-%m-%d %H:%i:%s') cap, score sc, edge_l el, center ce, edge_r er FROM inference_score_log WHERE coil_id=? AND camera_id=2 AND captured_at>=? AND captured_at<? AND edge_l IS NOT NULL`, [coil, w0, w1]) as Promise<any[]>,
        c.query(`SELECT ai_alert_id aid, camera_id cam, DATE_FORMAT(captured_at,'%Y-%m-%d %H:%i:%s') cap FROM detection_alert WHERE coil_id=? AND captured_at>=? AND captured_at<?`, [coil, w0, w1]) as Promise<any[]>,
        sb(`ai_tension_readings?select=captured_at,output_percent&parse_ok=is.true&captured_at=gte.${dUtc0}&captured_at=lt.${dUtc1}&order=captured_at`),
        sb(`leveler_jobs?product_name=eq.${encodeURIComponent(coil)}&work_date=eq.${wdate}&select=company_name,specification,original_weight,unit_price,amount,status`),
      ]);
      const rows = rawRows.map((x: any) => ({ t: tms(x.ts), b: x.b == null ? null : num(x.b), cut: num(x.cut) || 0, mv: num(x.mv) || 0, ld: num(x.ld), cy: num(x.cy), run: num(x.r), ss: num(x.ss) }));
      const { groups } = buildBoxes(rows);

      const intervalMs = rows.length > 1 ? (rows[rows.length - 1].t - rows[0].t) / (rows.length - 1) : 2600;
      const avg = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
      const boxes = groups.map((g, i) => {
        const t0 = g.sheets[0], t1 = g.sheets[g.sheets.length - 1];
        const inRange = rows.filter((r) => r.t >= t0 && r.t <= t1);
        const runRows = inRange.filter((r) => r.ld != null && r.ld > 20);
        const lds = runRows.map((r) => r.ld as number);
        const runMin = Math.max(0.1, runRows.length * intervalMs / 60000);
        const spanMin = Math.max(0.1, (t1 - t0) / 60000);
        const sheets = g.sheets.length;
        return { n: i + 1, s: hhmm(t0), e: hhmm(t1), t0, t1, runMin: Math.round(runMin), spanMin: Math.round(spanMin),
          workMin: Math.round(runMin), sheets, cut: Math.round(g.cut),
          spm: Math.round(sheets / runMin * 10) / 10,
          cycle: Math.round(runMin * 60 / sheets * 10) / 10,
          load: avg(lds) == null ? null : Math.round(avg(lds)! * 10) / 10,
          tension: null as number | null, warp: null as number | null, flatDef: 0, scratch: 0 };
      });
      const sheetsTotal = boxes.reduce((a, b) => a + b.sheets, 0);

      // 박스별 평탄 휨 최대 + 평탄/표면 결함 건수 (예전과 같은 구간: 박스 시작 분 ~ 마지막 장 +60초)
      const inf = infRaw.map((r) => ({ t: tms(r.cap), sc: num(r.sc), el: num(r.el), ce: num(r.ce), er: num(r.er) }));
      const dets = detRaw.map((r) => ({ t: tms(r.cap), aid: r.aid, cam: num(r.cam) }));
      for (const b of boxes) {
        const s0 = tms(`${wdate} ${b.s}:00`); const s1 = Math.floor((b.t1 + 60000) / 1000) * 1000;
        let mx: number | null = null; for (const r of inf) { if (r.t >= s0 && r.t <= s1 && r.sc != null && (mx == null || r.sc > mx)) mx = r.sc; }
        b.warp = r1(mx);
        const seen = new Set<string>(); let fd = 0, sd = 0;
        for (const r of dets) { if (r.t < s0 || r.t > s1) continue; const k = `${r.aid}|${r.cam}`; if (seen.has(k)) continue; seen.add(k); if (r.cam === 2) fd++; else sd++; }
        b.flatDef = fd; b.scratch = sd;
      }
      let ovMax: number | null = null, top: any = null;
      for (const r of inf) { if (r.sc != null && (ovMax == null || r.sc > ovMax)) { ovMax = r.sc; top = r; } }
      const flatOverall = { n: inf.length, warpMax: r1(ovMax), flatDef: boxes.reduce((a, b) => a + b.flatDef, 0), surf: boxes.reduce((a, b) => a + b.scratch, 0) };
      const cross = top ? { el: r1(top.el), ce: r1(top.ce), er: r1(top.er), sc: r1(top.sc) } : null;

      const tenPts = ten.map((r: any) => ({ ms: Date.parse(r.captured_at) + 9 * 3600000, v: num(r.output_percent) })).filter((p: any) => p.v != null);
      for (const b of boxes) { const sel = tenPts.filter((p: any) => p.ms >= b.t0 && p.ms <= b.t1); if (sel.length) b.tension = Math.round(sel.reduce((a: number, p: any) => a + p.v, 0) / sel.length); }
      const tenAll = tenPts.length ? Math.round(tenPts.reduce((a: number, p: any) => a + p.v, 0) / tenPts.length) : null;

      let erp: any = {}; if (jobs.length) { erp = { company: jobs[0].company_name, spec: jobs[0].specification, status: jobs[0].status, unit: num(jobs[0].unit_price), weight: 0, amount: 0 }; for (const j of jobs) { erp.weight += num(j.original_weight) || 0; erp.amount += num(j.amount) || 0; } }
      const sp = parseSpec(erp.spec || "");

      const thk = sp.thk;
      let cache = thk != null ? await sb(`leveling_job_cache?thk=eq.${thk}&select=job&limit=80`) : [];
      const thkMatched = cache.length >= 3;
      if (!thkMatched) cache = await sb(`leveling_job_cache?select=job&limit=80`);
      const bLds: number[] = [], bCys: number[] = [], bTns: number[] = [];
      for (const cc of cache) { const j = cc.job || {}; const L = num(j.load), C = num(j.cyc), T = num(j.tenAvg); if (L) bLds.push(L); if (C) bCys.push(C); if (T) bTns.push(T); }
      const bCyc = avg(bCys);
      const base = { load: r1(avg(bLds)), cycle: bCyc == null ? null : Math.round(bCyc * 10) / 10, spm: bCyc ? Math.round(60 / bCyc * 10) / 10 : null, tension: avg(bTns) == null ? null : Math.round(avg(bTns)!), n: cache.length, thkMatched };

      const setRows = rows.filter((r) => r.run === 1);
      const setup = { cut: boxes[0]?.cut ?? null, speedset: setRows[0]?.ss ?? null };

      return { status: 200, body: { ok: true, coil, date: wdate, company: erp.company ?? null, spec: erp.spec ?? null, thk: sp.thk, wd: sp.wd,
        weight: erp.weight || null, unit: erp.unit ?? null, amount: erp.amount || null, status: erp.status ?? null,
        start: boxes[0]?.s ?? null, end: boxes[boxes.length - 1]?.e ?? null, sheets: sheetsTotal,
        baseSpm: base.spm ?? null, baseLoad: base.load ?? null, baseCycle: base.cycle ?? null, baseTension: base.tension ?? null, baseN: base.n ?? 0, baseThkMatched: base.thkMatched ?? false,
        boxes: boxes.map(({ t0, t1, ...b }) => b), flat: flatOverall, cross, tenAvg: tenAll, setup,
        note: rows.length ? null : "PLC 데이터 없음", _mirror: mirrorStats[wdate] ?? null } };
    }

    return { status: 400, body: { ok: false, error: "mode=list|detail" } };
  } catch (e) { return { status: 500, body: { ok: false, error: String((e as Error)?.message || e) } }; }
  finally { if (cl) try { await cl.close(); } catch (_e) { /* ignore */ } }
}

// 끝난 코일의 상세·품질을 미리 계산(캐시 채우기) — 한 번에 하나씩
async function prewarm(date: string, coils: string[]) {
  for (const c of coils.slice(0, 15)) {
    for (const u of [`leveling-status?mode=detail&coil=${encodeURIComponent(c)}&date=${date}`, `leveling-quality?mode=coil&coil=${encodeURIComponent(c)}&date=${date}`]) {
      try { const r = await fetch(`${SB_URL}/functions/v1/${u}`, { headers: { "x-prewarm": "1" }, signal: AbortSignal.timeout(60000) }); await r.arrayBuffer(); } catch { /* 무시 */ }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const q = new URL(req.url).searchParams;
  const mode = q.get("mode") || "list";
  const date = q.get("date");
  const cacheable = !!date && !q.get("nocache") && (mode === "list" || (mode === "detail" && !!q.get("coil")));
  if (!cacheable) { const r = await compute(q); return json(r.body, r.status); }

  const day = date!.slice(0, 10);
  const today = kstToday();
  const past = day < today;
  const k = `status|${mode}|${(q.get("coil") || "").trim()}|${day}`;
  const prewarmReq = req.headers.get("x-prewarm") === "1";
  const c = await cacheGet(k);
  if (c) {
    const age = Date.now() - Date.parse(c.created_at);
    const refreshing = c.refreshing_at && Date.now() - Date.parse(c.refreshing_at) < 3 * 60000;
    const staleAfter = past ? 10 * 60000 : 60000;
    // 오늘 목록은 60초 넘으면 새로 계산(진행 중 코일), 그 밖에는 캐시로 바로 응답하고 오래됐으면 뒤에서 갱신
    const strict = !past && mode === "list";
    if (age < staleAfter) return json(c.body, 200, { "X-Cache": "HIT" });
    if (!strict && !prewarmReq) {
      if (!refreshing) { await cacheMark(k); bg(compute(q).then((r) => r.body?.ok ? cachePut(k, r.body) : null)); }
      return json(c.body, 200, { "X-Cache": "STALE" });
    }
  }
  const r = await compute(q);
  if (r.body?.ok) {
    await cachePut(k, r.body);
    if (mode === "list" && !prewarmReq) {
      const coils = (r.body.done || []).map((x: any) => x.coil).filter(Boolean);
      if (coils.length) bg(prewarm(day, coils));
    }
  }
  return json(r.body, r.status, { "X-Cache": "MISS" });
});
