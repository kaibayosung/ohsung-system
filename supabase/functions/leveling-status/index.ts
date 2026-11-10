import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

// ===== 레벨러 작업현황/상세 데이터 API =====
// mode=list&date=YYYY-MM-DD   → 작업 현황(진행중/완료/대기) + 규격/단가/금액/상태 + 품질요약
// mode=detail&coil=&date=     → 박스별 속도·장비·텐션·평탄 + 평소(baseline) + 셋팅
// 품질 결함 리스트/이미지/영상은 기존 leveling-quality(mode=coil|img|levvid) 재사용.

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
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
    password: pass, db: Deno.env.get("LEVELER_DB_NAME") || "ohsung", timeout: 20000,
  });
}
// Supabase REST (service role)
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
async function sb(path: string): Promise<any[]> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, signal: AbortSignal.timeout(12000) });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}
function parseSpec(s: string) { const m = String(s || "").toUpperCase().replace(/\s/g, "").match(/^([\d.]+)X(\d+)/); return { thk: m ? num(m[1]) : null, wd: m ? num(m[2]) : null }; }
function grade(ratio: number | null) { if (ratio == null) return null; if (ratio >= 95) return "A"; if (ratio >= 85) return "B"; if (ratio >= 70) return "C"; return "D"; }

// MOVELENSV 리셋으로 장(sheet) 완료 검출 → 박스 그룹
function buildBoxes(rows: Array<{ t: number; b: number | null; cut: number; mv: number }>) {
  const sh: Array<{ t: number; len: number; box: number | null }> = [];
  for (let i = 1; i < rows.length; i++) { const p = rows[i - 1], r = rows[i]; if (p.mv - r.mv > 100 && p.cut >= 100 && p.cut < 20000) sh.push({ t: r.t, len: p.cut, box: p.b }); }
  if (!sh.length) return { groups: [] as Array<{ key: number | null; cut: number; sheets: number[] }>, useBox: false };
  const boxVals = new Set(sh.filter((s) => s.box != null && s.box > 0).map((s) => s.box)); const useBox = boxVals.size >= 2;
  const groups: Array<{ key: number | null; cut: number; sheets: number[] }> = []; let g: any = null, lastLen = 0;
  for (const s of sh) { const isNew = !g || (useBox ? s.box !== g.key : Math.abs(s.len - lastLen) > 3); if (isNew) { g = { key: useBox ? s.box : null, cut: s.len, sheets: [] }; groups.push(g); } g.sheets.push(s.t); lastLen = s.len; }
  return { groups, useBox };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const q = new URL(req.url).searchParams;
  const mode = q.get("mode") || "list";
  const date = (q.get("date") || kstToday()).slice(0, 10);
  const d0 = date + " 00:00:00", d1 = addDays(date, 1) + " 00:00:00";
  const FLAT_THR = num(q.get("thr")) || 25; // 평탄 휨 기준(mm)

  let cl: Client | null = null;
  try {
    cl = await db();

    // ================= LIST =================
    if (mode === "list") {
      // 1) 당일 PLC 코일
      const plc = (await cl.query(
        `SELECT COIL_ID coil, DATE_FORMAT(MIN(TIMESTAMP),'%H:%i') st, DATE_FORMAT(MAX(TIMESTAMP),'%H:%i') en,
                DATE_FORMAT(MIN(TIMESTAMP),'%Y-%m-%d %H:%i:%s') t0s, DATE_FORMAT(MAX(TIMESTAMP),'%Y-%m-%d %H:%i:%s') t1s, COUNT(*) n
         FROM LEVELING_DATA WHERE TIMESTAMP>=? AND TIMESTAMP<? AND COIL_ID IS NOT NULL AND TRIM(COIL_ID)<>'' AND COIL_ID NOT LIKE '0000%'
         GROUP BY COIL_ID ORDER BY MIN(TIMESTAMP)`, [d0, d1]) as any[]);
      const nowKSTms = Date.parse(new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 19) + "Z");
      const coils = plc.map((r) => String(r.coil).trim());

      // 2) 박스/장수 (코일별)
      const sheetsByCoil = new Map<string, { sheets: number; boxes: number; cut: number | null }>();
      for (const c of coils) {
        const rows = ((await cl.query(`SELECT UNIX_TIMESTAMP(TIMESTAMP)*1000 t, BOXIDX b, CUTLENSET cut, MOVELENSV mv FROM LEVELING_DATA WHERE COIL_ID=? AND TIMESTAMP>=? AND TIMESTAMP<? ORDER BY TIMESTAMP, ID`, [c, d0, d1])) as any[])
          .map((x) => ({ t: num(x.t) || 0, b: x.b == null ? null : num(x.b), cut: num(x.cut) || 0, mv: num(x.mv) || 0 }));
        const { groups } = buildBoxes(rows);
        const sheets = groups.reduce((a, g) => a + g.sheets.length, 0);
        sheetsByCoil.set(c, { sheets, boxes: groups.length, cut: groups[0]?.cut ?? null });
      }

      // 3) 품질요약 — 평탄(inference cam2) + 결함(detection_alert)
      const flatMap = new Map<string, { ratio: number | null; warpMax: number | null }>();
      const defMap = new Map<string, { surf: number; flat: number }>();
      if (coils.length) {
        const ph = coils.map(() => "?").join(",");
        const fl = (await cl.query(`SELECT coil_id coil, ROUND(MAX(score),1) warpMax FROM inference_score_log WHERE camera_id=2 AND captured_at>=? AND captured_at<? AND coil_id IN (${ph}) GROUP BY coil_id`, [d0, d1, ...coils])) as any[];
        for (const r of fl) { flatMap.set(String(r.coil).trim(), { ratio: null, warpMax: num(r.warpMax) }); }
        const det = (await cl.query(`SELECT coil_id coil, camera_id cam, COUNT(*) n FROM detection_alert WHERE captured_at>=? AND captured_at<? AND coil_id IN (${ph}) GROUP BY coil_id, camera_id`, [d0, d1, ...coils])) as any[];
        for (const r of det) { const k = String(r.coil).trim(), o = defMap.get(k) || { surf: 0, flat: 0 }; if (num(r.cam) === 2) o.flat += num(r.n) || 0; else o.surf += num(r.n) || 0; defMap.set(k, o); }
      }

      // 4) ERP (leveler_jobs) — 코일별 집계
      const jobs = await sb(`leveler_jobs?work_date=eq.${date}&select=product_name,company_name,specification,original_weight,length,unit_price,amount,status,process_rule`);
      const erp = new Map<string, any>();
      for (const j of jobs) { const k = String(j.product_name || "").trim(); if (!k) continue; const o = erp.get(k) || { company: j.company_name, spec: j.specification, weight: 0, amount: 0, unit: num(j.unit_price), status: j.status, rule: j.process_rule }; o.weight += num(j.original_weight) || 0; o.amount += num(j.amount) || 0; if (!o.spec) o.spec = j.specification; erp.set(k, o); }

      const done: any[] = []; let running: any = null;
      for (const r of plc) {
        const c = String(r.coil).trim(); const sc = sheetsByCoil.get(c)!; const e = erp.get(c) || {}; const fm = flatMap.get(c) || {}; const dm = defMap.get(c) || { surf: 0, flat: 0 };
        const sp = parseSpec(e.spec || "");
        const t0 = tms(r.t0s), t1 = tms(r.t1s);
        const durMin = Math.round((t1 - t0) / 60000);
        const row = { coil: c, company: e.company ?? null, spec: e.spec ?? null, thk: sp.thk, start: r.st, end: r.en, durMin,
          sheets: sc.sheets, boxes: sc.boxes, cut: sc.cut, weight: e.weight || null, unit: e.unit ?? null, amount: e.amount || null,
          status: e.status ?? null, warpMax: fm.warpMax ?? null, flatDef: dm.flat, surf: dm.surf };
        // 진행중: 당일 & 마지막 PLC가 최근 15분 이내
        const active = date === kstToday() && (nowKSTms - t1) < 900000;
        if (active && !running) {
          // 예상 장수(물리): length_m = kg/(thk_m*wd_m*7850), sheets = len_m*1000/cut
          let planned: number | null = null;
          if (sp.thk && sp.wd && e.weight && sc.cut) { const lenM = e.weight / ((sp.thk / 1000) * (sp.wd / 1000) * 7850); planned = Math.round(lenM * 1000 / sc.cut); if (planned < sc.sheets || planned > sc.sheets * 10) planned = null; }
          running = { ...row, planned, pct: planned ? Math.min(99, Math.round(sc.sheets / planned * 100)) : null, curBox: sc.boxes };
        } else { done.push(row); }
      }

      // 5) 대기(지시는 있으나 당일 PLC 없음)
      const waiting = jobs
        .filter((j: any) => { const st = String(j.status || ""); return st !== "완료" && !coils.includes(String(j.product_name || "").trim()); })
        .reduce((acc: any[], j: any) => { const k = String(j.product_name || "").trim(); if (acc.find((x) => x.coil === k)) return acc; const sp = parseSpec(j.specification || ""); acc.push({ coil: k, company: j.company_name, spec: j.specification, weight: num(j.original_weight), unit: num(j.unit_price), status: j.status, estSheets: null }); return acc; }, [])
        .slice(0, 20);

      return json({ ok: true, date, running, done, waiting });
    }

    // ================= DETAIL =================
    if (mode === "detail") {
      const coil = (q.get("coil") || "").trim(); if (!coil) return json({ ok: false, error: "coil" }, 400);
      let wdate = date; if (!q.get("date")) { const w = (await cl.query(`SELECT DATE_FORMAT(MAX(TIMESTAMP),'%Y-%m-%d') d FROM LEVELING_DATA WHERE COIL_ID=?`, [coil])) as any[]; if (w[0]?.d) wdate = w[0].d; }
      const w0 = wdate + " 00:00:00", w1 = addDays(wdate, 1) + " 00:00:00";

      const rows = ((await cl.query(
        `SELECT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d %H:%i:%s') ts, BOXIDX b, CUTLENSET cut, MOVELENSV mv, INVERTERSPEEDPER ld, CYCLETM cy, RUN run, SPEEDSET ss
         FROM LEVELING_DATA WHERE COIL_ID=? AND TIMESTAMP>=? AND TIMESTAMP<? ORDER BY TIMESTAMP, ID`, [coil, w0, w1])) as any[])
        .map((x) => ({ t: tms(x.ts), b: x.b == null ? null : num(x.b), cut: num(x.cut) || 0, mv: num(x.mv) || 0, ld: num(x.ld), cy: num(x.cy), run: num(x.run), ss: num(x.ss) }));
      const { groups } = buildBoxes(rows);

      // 행 간격(초) — 운전시간 환산용
      const intervalMs = rows.length > 1 ? (rows[rows.length - 1].t - rows[0].t) / (rows.length - 1) : 2600;
      const avg = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
      // 박스별 집계 (운전행 = 인버터 구동 ld>20 기준)
      const boxes = groups.map((g, i) => {
        const t0 = g.sheets[0], t1 = g.sheets[g.sheets.length - 1];
        const inRange = rows.filter((r) => r.t >= t0 && r.t <= t1);
        const runRows = inRange.filter((r) => r.ld != null && r.ld > 20);
        const lds = runRows.map((r) => r.ld as number);
        const cys = runRows.map((r) => r.cy).filter((v): v is number => v != null && v > 0 && v < 30);
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

      // 박스별 평탄 휨(inference cam2 최대) + 평탄/표면 결함 건수(detection_alert)
      for (const b of boxes) {
        const s0 = `${wdate} ${b.s}:00`; const s1 = new Date(b.t1 + 60000).toISOString().replace("T", " ").slice(0, 19);
        const f = ((await cl.query(`SELECT ROUND(MAX(score),1) wmax FROM inference_score_log WHERE coil_id=? AND camera_id=2 AND captured_at>=? AND captured_at<=? AND edge_l IS NOT NULL`, [coil, s0, s1])) as any[])[0];
        b.warp = num(f?.wmax);
        const d = ((await cl.query(`SELECT SUM(CASE WHEN camera_id=2 THEN 1 ELSE 0 END) fd, SUM(CASE WHEN camera_id<>2 THEN 1 ELSE 0 END) sd FROM (SELECT DISTINCT ai_alert_id, camera_id FROM detection_alert WHERE coil_id=? AND captured_at>=? AND captured_at<=?) z`, [coil, s0, s1])) as any[])[0];
        b.flatDef = num(d?.fd) || 0; b.scratch = num(d?.sd) || 0;
      }
      const ov = ((await cl.query(`SELECT COUNT(*) n, ROUND(MAX(score),1) wmax FROM inference_score_log WHERE coil_id=? AND camera_id=2 AND captured_at>=? AND captured_at<? AND edge_l IS NOT NULL`, [coil, w0, w1])) as any[])[0];
      const flatOverall = { n: num(ov?.n) || 0, warpMax: num(ov?.wmax), flatDef: boxes.reduce((a, b) => a + b.flatDef, 0), surf: boxes.reduce((a, b) => a + b.scratch, 0) };
      const cross = ((await cl.query(`SELECT ROUND(edge_l,1) el, ROUND(center,1) ce, ROUND(edge_r,1) er, ROUND(score,1) sc FROM inference_score_log WHERE coil_id=? AND camera_id=2 AND captured_at>=? AND captured_at<? AND edge_l IS NOT NULL ORDER BY score DESC LIMIT 1`, [coil, w0, w1])) as any[])[0] || null;

      // 텐션(ai_tension_readings, UTC→KST) 박스별
      const dUtc0 = new Date(Date.parse(wdate + "T00:00:00+09:00")).toISOString();
      const dUtc1 = new Date(Date.parse(addDays(wdate, 1) + "T00:00:00+09:00")).toISOString();
      const ten = await sb(`ai_tension_readings?select=captured_at,output_percent&parse_ok=is.true&captured_at=gte.${dUtc0}&captured_at=lt.${dUtc1}&order=captured_at`);
      const tenPts = ten.map((r: any) => ({ ms: Date.parse(r.captured_at) + 9 * 3600000, v: num(r.output_percent) })).filter((p: any) => p.v != null);
      for (const b of boxes) { const sel = tenPts.filter((p: any) => p.ms >= b.t0 && p.ms <= b.t1); if (sel.length) b.tension = Math.round(sel.reduce((a: number, p: any) => a + p.v, 0) / sel.length); }
      const tenAll = tenPts.length ? Math.round(tenPts.reduce((a: number, p: any) => a + p.v, 0) / tenPts.length) : null;

      // ERP
      const jobs = await sb(`leveler_jobs?product_name=eq.${encodeURIComponent(coil)}&work_date=eq.${wdate}&select=company_name,specification,original_weight,unit_price,amount,status`);
      let erp: any = {}; if (jobs.length) { erp = { company: jobs[0].company_name, spec: jobs[0].specification, status: jobs[0].status, unit: num(jobs[0].unit_price), weight: 0, amount: 0 }; for (const j of jobs) { erp.weight += num(j.original_weight) || 0; erp.amount += num(j.amount) || 0; } }
      const sp = parseSpec(erp.spec || "");

      // 평소(baseline): 부하/사이클 = 최근 30일 운전 평균(PLC), 속도/텐션 = 캐시(과거 집계) 평균
      const thk = sp.thk;
      let cache = thk != null ? await sb(`leveling_job_cache?thk=eq.${thk}&select=job&limit=80`) : [];
      const thkMatched = cache.length >= 3;
      if (!thkMatched) cache = await sb(`leveling_job_cache?select=job&limit=80`);
      const bLds: number[] = [], bCys: number[] = [], bTns: number[] = [];
      for (const c of cache) { const j = c.job || {}; const L = num(j.load), C = num(j.cyc), T = num(j.tenAvg); if (L) bLds.push(L); if (C) bCys.push(C); if (T) bTns.push(T); }
      const bCyc = avg(bCys);
      const base = { load: r1(avg(bLds)), cycle: bCyc == null ? null : Math.round(bCyc * 10) / 10, spm: bCyc ? Math.round(60 / bCyc * 10) / 10 : null, tension: avg(bTns) == null ? null : Math.round(avg(bTns)!), n: cache.length, thkMatched };

      // 셋팅 대표값
      const setRows = rows.filter((r) => r.run === 1);
      const setup = { cut: boxes[0]?.cut ?? null, speedset: setRows[0]?.ss ?? null };

      return json({ ok: true, coil, date: wdate, company: erp.company ?? null, spec: erp.spec ?? null, thk: sp.thk, wd: sp.wd,
        weight: erp.weight || null, unit: erp.unit ?? null, amount: erp.amount || null, status: erp.status ?? null,
        start: boxes[0]?.s ?? null, end: boxes[boxes.length - 1]?.e ?? null, sheets: sheetsTotal,
        baseSpm: base.spm ?? null, baseLoad: base.load ?? null, baseCycle: base.cycle ?? null, baseTension: base.tension ?? null, baseN: base.n ?? 0, baseThkMatched: base.thkMatched ?? false,
        boxes: boxes.map(({ t0, t1, ...b }) => b), flat: flatOverall, cross, tenAvg: tenAll, setup,
        note: rows.length ? null : "PLC 데이터 없음" });
    }

    return json({ ok: false, error: "mode=list|detail" }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 500); }
  finally { if (cl) try { await cl.close(); } catch (_e) { /* ignore */ } }
});
