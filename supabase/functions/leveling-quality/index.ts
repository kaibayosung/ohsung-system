// leveling-quality v10 (2026-11-19) — 속도 개선
//  - mode=coil: 질의 4개를 동시에(연결 4개) + 응답 캐시(leveling_view_cache).
//    지난 날짜는 캐시로 바로 응답하고 10분 넘었으면 뒤에서 새로 계산, 오늘은 60초 넘었으면 뒤에서 새로 계산.
//  - PLC 행은 Supabase 거울(lvmirror.ts)에서 읽음 — 공장 인터넷 업로드 절약.
//  - nocache=1 이면 캐시를 쓰지 않음(점검용). 다른 mode는 예전 그대로.
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";
import { mirrorDayRows } from "./lvmirror.ts";
declare const EdgeRuntime: any;

const SRC = "http://osungsteel.servehttp.com:38080";
const CORS: Record<string, string> = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges, location" };
const MIN = 60000;
const json = (b: unknown, s = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const tms = (s: unknown) => (s ? Date.parse(String(s).replace(" ", "T") + "Z") : NaN);
const kstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

async function db(): Promise<Client> {
  const pass = Deno.env.get("LEVELER_DB_PASS") || ""; if (!pass) throw new Error("LEVELER_DB_PASS secret");
  return await new Client().connect({ hostname: Deno.env.get("LEVELER_DB_HOST") || "osungsteel.servehttp.com", port: parseInt(Deno.env.get("LEVELER_DB_PORT") || "33306", 10), username: Deno.env.get("LEVELER_DB_USER") || "ohsung", password: pass, db: Deno.env.get("LEVELER_DB_NAME") || "ohsung", timeout: 20000, poolSize: 4 });
}
function parseSpec(s: string) { const m = String(s || "").toUpperCase().replace(/\s/g, "").match(/^([\d.]+)X(\d+)/); return m ? { thk: num(m[1]), wd: num(m[2]) } : { thk: null, wd: null }; }
function buildBoxes(rows: Array<{ t: number; b: number | null; cut: number; mv: number }>) {
  const sh: Array<{ t: number; len: number; box: number | null }> = [];
  for (let i = 1; i < rows.length; i++) { const p = rows[i - 1], r = rows[i]; if (p.mv - r.mv > 100 && p.cut >= 100 && p.cut < 20000) sh.push({ t: r.t, len: p.cut, box: p.b }); }
  if (!sh.length) return { groups: [] as Array<{ key: number | null; cut: number; sheets: number[] }>, sheetMap: [] as Array<{ t: number; g: number; pos: number }> };
  const boxVals = new Set(sh.filter((s) => s.box != null && s.box > 0).map((s) => s.box)); const useBox = boxVals.size >= 2;
  const groups: Array<{ key: number | null; cut: number; sheets: number[] }> = []; let g: any = null, lastLen = 0;
  const sheetMap: Array<{ t: number; g: number; pos: number }> = [];
  for (const s of sh) { const isNew = !g || (useBox ? s.box !== g.key : Math.abs(s.len - lastLen) > 3); if (isNew) { g = { key: useBox ? s.box : null, cut: s.len, sheets: [] }; groups.push(g); } g.sheets.push(s.t); lastLen = s.len; sheetMap.push({ t: s.t, g: groups.length - 1, pos: g.sheets.length }); }
  return { groups, sheetMap, useBox };
}

// ───────── 캐시 ─────────
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SBH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const CT = "leveling_view_cache";
async function cacheGet(k: string) { try { const r = await fetch(`${SB_URL}/rest/v1/${CT}?k=eq.${encodeURIComponent(k)}&select=body,created_at,refreshing_at`, { headers: SBH, signal: AbortSignal.timeout(8000) }); const a = r.ok ? await r.json() : []; return a[0] || null; } catch { return null; } }
async function cachePut(k: string, body: unknown) { try { await fetch(`${SB_URL}/rest/v1/${CT}?on_conflict=k`, { method: "POST", headers: { ...SBH, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ k, body, created_at: new Date().toISOString(), refreshing_at: null }), signal: AbortSignal.timeout(12000) }); } catch { /* 무시 */ } }
async function cacheMark(k: string) { try { await fetch(`${SB_URL}/rest/v1/${CT}?k=eq.${encodeURIComponent(k)}`, { method: "PATCH", headers: { ...SBH, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ refreshing_at: new Date().toISOString() }), signal: AbortSignal.timeout(8000) }); } catch { /* 무시 */ } }
function bg(p: Promise<unknown>) { try { EdgeRuntime.waitUntil(p.catch(() => {})); } catch { p.catch(() => {}); } }

async function computeCoil(q: URLSearchParams): Promise<{ status: number; body: any }> {
  const date = (q.get("date") || kstToday()).slice(0, 10);
  const tzmin = num(q.get("tzmin")) || 0;
  let cl: Client | null = null;
  try {
    cl = await db(); const c = cl;
    const coil = (q.get("coil") || "").trim(); if (!coil) return { status: 400, body: { ok: false, error: "coil" } };
    let wdate = date; if (!q.get("date")) { const w = (await c.query(`SELECT DATE_FORMAT(MAX(TIMESTAMP),'%Y-%m-%d') d FROM LEVELING_DATA WHERE COIL_ID = ?`, [coil])) as any[]; if (w[0]?.d) wdate = w[0].d; }
    const w0 = wdate + " 00:00:00", w1 = addDays(wdate, 1) + " 00:00:00";
    const [rawRows, det, edg, ev] = await Promise.all([
      mirrorDayRows(c, wdate).then((rs) => rs.filter((x: any) => String(x.c ?? "").trim().toUpperCase() === coil.toUpperCase())),
      c.query(`SELECT id, ai_alert_id aid, camera_id cam, DATE_FORMAT(captured_at,'%Y-%m-%d %H:%i:%s') cap, metric, score, threshold thr, image_path img, roi_x, roi_y, roi_w, roi_h, box_idx, segment_id seg, video_ms vms, human_label hl FROM detection_alert WHERE coil_id = ? AND captured_at >= ? AND captured_at < ? ORDER BY captured_at`, [coil, w0, w1]) as Promise<any[]>,
      c.query(`SELECT DATE_FORMAT(captured_at,'%Y-%m-%d %H:%i:%s') cap, edge_l el, center ce, edge_r er FROM inference_score_log WHERE coil_id = ? AND camera_id = 2 AND captured_at >= ? AND captured_at < ? AND edge_l IS NOT NULL ORDER BY captured_at`, [coil, w0, w1]) as Promise<any[]>,
      c.query(`SELECT specification spec, company_name cu FROM erp_data WHERE product_name = ? LIMIT 1`, [coil]) as Promise<any[]>,
    ]);
    const rows = rawRows.map((x: any) => ({ t: tms(x.ts), b: x.b == null ? null : num(x.b), cut: num(x.cut) || 0, mv: num(x.mv) || 0 }));
    const { groups, sheetMap } = buildBoxes(rows);
    const sizes = groups.map((g) => g.sheets.length); const starts: number[] = []; let acc = 0; for (const s of sizes) { starts.push(acc); acc += s; }
    const boxes = sizes.map((sz, i) => ({ n: i + 1, size: sz, s1: starts[i] + 1, s2: starts[i] + sz, cut: groups[i].cut }));
    const edgeRows = edg.map((r) => ({ t: tms(r.cap), el: num(r.el), ce: num(r.ce), er: num(r.er) }));
    const nearestEdge = (cap: number) => { let best: any = null, bg2 = Infinity; for (const e of edgeRows) { const g = Math.abs(e.t - cap); if (g < bg2) { bg2 = g; best = e; } } return best && bg2 < 120000 ? best : null; };
    const nearestSheet = (cap: number, boxIdx: number | null) => { let cand = sheetMap; if (boxIdx != null && boxIdx > 0) { const gi = groups.findIndex((g) => g.key === boxIdx); if (gi >= 0) cand = sheetMap.filter((s) => s.g === gi); } let best: any = null, bg2 = Infinity; for (const s of cand) { const g = Math.abs(s.t - cap); if (g < bg2) { bg2 = g; best = s; } } return best ? { box: best.g + 1, sheet: best.pos, abs: starts[best.g] + best.pos, gapMin: Math.round(bg2 / MIN) } : null; };
    const GAP = 4000; const clusters: any[] = []; let cur: any = null;
    for (const r of det) { const cam = num(r.cam) || 0, cap = tms(r.cap), sc = num(r.score) ?? 0; if (cur && cur.cam === cam && cur.metric === r.metric && cap - cur.lastCap < GAP) { cur.n++; cur.lastCap = cap; if (sc > cur.peakScore) { cur.peakScore = sc; cur.peak = r; cur.peakCap = cap; } } else { if (cur) clusters.push(cur); cur = { cam, metric: r.metric, n: 1, firstCap: cap, lastCap: cap, peakScore: sc, peak: r, peakCap: cap }; } }
    if (cur) clusters.push(cur); clusters.sort((a, b) => a.peakCap - b.peakCap);
    const rnd = (v: number | null, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
    const defects = clusters.slice(0, 400).map((cc) => { const r = cc.peak, cap = cc.peakCap + tzmin * MIN, cam = cc.cam; const sm = nearestSheet(cap, num(r.box_idx)); let kind = cam === 2 ? "fl" : "sf"; let edge: (number | null)[] | null = null; if (cam === 2) { const e = nearestEdge(cap); if (e) { edge = [rnd(e.el, 1), rnd(e.ce, 1), rnd(e.er, 1)]; const tilt = Math.abs((e.er ?? 0) - (e.el ?? 0)); const centerHi = (e.ce ?? 0) >= (e.el ?? 0) && (e.ce ?? 0) >= (e.er ?? 0); kind = tilt >= 8 ? "ew" : (centerHi ? "cb" : "ew"); } } return { id: num(r.id), aid: num(r.aid), cam, metric: r.metric ?? null, kind, at: r.cap, n: cc.n, durSec: Math.round((cc.lastCap - cc.firstCap) / 1000), box: sm?.box ?? num(r.box_idx), sheet: sm?.sheet ?? null, abs: sm?.abs ?? null, gapMin: sm?.gapMin ?? null, score: rnd(num(r.score), cam === 2 ? 1 : 3), warp: cam === 2 ? rnd(num(r.score), 1) : null, thr: num(r.thr), roi: (r.roi_x != null) ? { x: rnd(num(r.roi_x), 3), y: rnd(num(r.roi_y), 3), w: rnd(num(r.roi_w), 3), h: rnd(num(r.roi_h), 3) } : null, edge, seg: r.seg ?? null, vms: num(r.vms), hasImg: !!r.img, hasVid: !!(r.seg || num(r.vms)), label: r.hl ?? null }; });
    const e = ev[0]; const sp = parseSpec(e?.spec || "");
    const surf = defects.filter((d) => d.cam !== 2).length, flat = defects.filter((d) => d.cam === 2).length;
    return { status: 200, body: { ok: true, coil, date: wdate, thk: sp.thk, wd: sp.wd, company: e?.cu ?? null, sheets: acc, boxesN: sizes.length, boxes, defects, surf, flat, total: defects.length, rawAlerts: det.length, clustered: clusters.length, note: rows.length ? null : "PLC data none" } };
  } catch (e) { return { status: 500, body: { ok: false, error: String((e as Error)?.message || e) } }; }
  finally { if (cl) try { await cl.close(); } catch (_e) { /* ignore */ } }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const q = new URL(req.url).searchParams;
  const mode = q.get("mode") || "coils";

  if (mode === "img" || mode === "vid") {
    const id = (q.get("id") || "").replace(/[^0-9]/g, ""); if (!id) return json({ ok: false, error: "id" }, 400);
    const ep = mode === "vid" ? "video" : "image";
    try { const range = req.headers.get("range"); const r = await fetch(`${SRC}/api/leveling/detections/${id}/${ep}`, { headers: range ? { range } : {}, signal: AbortSignal.timeout(15000) }); if (!r.ok) return json({ ok: false, error: `${ep} ${r.status}` }, 502); const h: Record<string,string> = { ...CORS, "Content-Type": r.headers.get("content-type") || (mode === "vid" ? "video/mp4" : "image/jpeg"), "Cache-Control": "public, max-age=120" }; const cl2 = r.headers.get("content-length"); if (cl2) h["Content-Length"] = cl2; const ar = r.headers.get("accept-ranges"); if (ar) h["Accept-Ranges"] = ar; const cr = r.headers.get("content-range"); if (cr) h["Content-Range"] = cr; return new Response(r.body, { status: r.status, headers: h }); } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 502); }
  }

  if (mode === "levvid") {
    const seg = q.get("seg") || "", file = q.get("file") || "";
    if (!seg || !file) return json({ ok: false, error: "seg,file 필요" }, 400);
    try {
      const pu = await fetch(`${SRC}/api/leveling/videos/${encodeURIComponent(seg)}/files/${encodeURIComponent(file)}/play-url`, { signal: AbortSignal.timeout(12000) });
      if (!pu.ok) return json({ ok: false, error: "play-url " + pu.status }, 502);
      const pj = await pu.json(); const url = pj && pj.url;
      if (!url) return json({ ok: false, error: "no url", body: pj }, 502);
      if (q.get("probe")) { try { const hr = await fetch(url, { headers: { range: "bytes=0-100" }, signal: AbortSignal.timeout(12000) }); return json({ ok: true, url, expiresAt: pj.expiresAt, streamStatus: hr.status, type: hr.headers.get("content-type"), len: hr.headers.get("content-length") }); } catch (e) { return json({ ok: false, url, streamErr: String((e as Error)?.message || e) }, 502); } }
      if (q.get("redirect")) return new Response(null, { status: 302, headers: { ...CORS, "Location": url, "Cache-Control": "no-store" } });
      const range = req.headers.get("range");
      const r = await fetch(url, { headers: range ? { range } : {}, signal: AbortSignal.timeout(25000) });
      const h: Record<string,string> = { ...CORS, "Content-Type": r.headers.get("content-type") || "video/mp4", "Cache-Control": "no-store" };
      const cl2 = r.headers.get("content-length"); if (cl2) h["Content-Length"] = cl2;
      const ar = r.headers.get("accept-ranges"); if (ar) h["Accept-Ranges"] = ar;
      const cr = r.headers.get("content-range"); if (cr) h["Content-Range"] = cr;
      return new Response(r.body, { status: r.status, headers: h });
    } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 502); }
  }

  if (mode === "coil") {
    const dateP = q.get("date"); const coilP = (q.get("coil") || "").trim();
    if (!dateP || !coilP || q.get("nocache")) { const r = await computeCoil(q); return json(r.body, r.status); }
    const day = dateP.slice(0, 10); const past = day < kstToday();
    const k = `quality|coil|${coilP}|${day}|${num(q.get("tzmin")) || 0}`;
    const prewarmReq = req.headers.get("x-prewarm") === "1";
    const c = await cacheGet(k);
    if (c) {
      const age = Date.now() - Date.parse(c.created_at);
      const refreshing = c.refreshing_at && Date.now() - Date.parse(c.refreshing_at) < 3 * 60000;
      if (age < (past ? 10 * 60000 : 60000)) return json(c.body, 200, { "X-Cache": "HIT" });
      if (!prewarmReq) {
        if (!refreshing) { await cacheMark(k); bg(computeCoil(q).then((r) => r.body?.ok ? cachePut(k, r.body) : null)); }
        return json(c.body, 200, { "X-Cache": "STALE" });
      }
    }
    const r = await computeCoil(q);
    if (r.body?.ok) await cachePut(k, r.body);
    return json(r.body, r.status, { "X-Cache": "MISS" });
  }

  const date = (q.get("date") || kstToday()).slice(0, 10);
  const d0 = date + " 00:00:00", d1 = addDays(date, 1) + " 00:00:00";
  let cl: Client | null = null;
  try {
    cl = await db();

    if (mode === "segments") {
      const coil = (q.get("coil") || "").trim();
      let segs: any[] = [];
      try { segs = (await cl.query(`SELECT segment_id, coil_id, box_id, kind, DATE_FORMAT(started_at,'%H:%i:%s') st, DATE_FORMAT(ended_at,'%H:%i:%s') en, files, total_bytes FROM recording_segment WHERE coil_id=? AND started_at>=? AND started_at<? AND kind='JOB' ORDER BY started_at LIMIT 100`, [coil, d0, d1])) as any[]; } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 500); }
      return json({ ok: true, coil, segments: segs });
    }

    if (mode === "flatness") {
      const thr = num(q.get("thr")) || 10;
      const W = `camera_id = 2 AND captured_at >= ? AND captured_at < ? AND edge_l IS NOT NULL`;
      const s = ((await cl.query(`SELECT COUNT(*) n, DATE_FORMAT(MIN(captured_at),'%H:%i:%s') st, DATE_FORMAT(MAX(captured_at),'%H:%i:%s') en, COUNT(DISTINCT coil_id) coils, COUNT(DISTINCT box_idx) boxes, COUNT(DISTINCT segment_id) segs, ROUND(AVG(score),2) warpAvg, ROUND(MAX(score),2) warpMax, ROUND(MIN(score),2) warpMin, ROUND(STDDEV(score),2) warpStd, ROUND(AVG(edge_l),2) elAvg, ROUND(AVG(center),2) ceAvg, ROUND(AVG(edge_r),2) erAvg, ROUND(MIN(edge_l),2) elMin, ROUND(MAX(edge_l),2) elMax, ROUND(MIN(center),2) ceMin, ROUND(MAX(center),2) ceMax, ROUND(MIN(edge_r),2) erMin, ROUND(MAX(edge_r),2) erMax, ROUND(AVG(ABS(edge_r-edge_l)),2) tiltAvg, ROUND(MAX(ABS(edge_r-edge_l)),2) tiltMax, SUM(CASE WHEN score>=${thr} THEN 1 ELSE 0 END) overN, COUNT(video_ms) hasVms, COUNT(segment_id) hasSeg, COUNT(box_idx) hasBox, COUNT(coil_id) hasCoil FROM inference_score_log WHERE ${W}`, [d0, d1])) as any[])[0];
      const cls = ((await cl.query(`SELECT SUM(CASE WHEN ABS(edge_r-edge_l)>=8 THEN 1 ELSE 0 END) tilt, SUM(CASE WHEN ABS(edge_r-edge_l)<8 AND center>=edge_l AND center>=edge_r THEN 1 ELSE 0 END) centerHi, SUM(CASE WHEN ABS(edge_r-edge_l)<8 AND center< edge_l AND center< edge_r THEN 1 ELSE 0 END) edgeHi, SUM(CASE WHEN score< ${thr} THEN 1 ELSE 0 END) flat FROM inference_score_log WHERE ${W}`, [d0, d1])) as any[])[0];
      const hist = (await cl.query(`SELECT FLOOR(LEAST(GREATEST(score,0),60)/5)*5 b, COUNT(*) n FROM inference_score_log WHERE ${W} GROUP BY b ORDER BY b`, [d0, d1])) as any[];
      const series = (await cl.query(`SELECT DATE_FORMAT(MIN(captured_at),'%H:%i') t, ROUND(AVG(score),1) warp, ROUND(MAX(score),1) warpMax, ROUND(AVG(edge_l),1) el, ROUND(AVG(center),1) ce, ROUND(AVG(edge_r),1) er, COUNT(*) n FROM inference_score_log WHERE ${W} GROUP BY FLOOR(UNIX_TIMESTAMP(captured_at)/180) ORDER BY MIN(captured_at)`, [d0, d1])) as any[];
      const perCoil = (await cl.query(`SELECT coil_id coil, COUNT(*) n, ROUND(AVG(score),1) warpAvg, ROUND(MAX(score),1) warpMax, SUM(CASE WHEN score>=${thr} THEN 1 ELSE 0 END) overN FROM inference_score_log WHERE ${W} GROUP BY coil_id ORDER BY n DESC LIMIT 20`, [d0, d1])) as any[];
      return json({ ok: true, date, thr, summary: s, classes: cls, hist, series, perCoil });
    }

    if (mode === "coils") {
      const plc = (await cl.query(`SELECT COIL_ID coil, DATE_FORMAT(MIN(TIMESTAMP),'%H:%i') st, DATE_FORMAT(MAX(TIMESTAMP),'%H:%i') en, COUNT(*) n FROM LEVELING_DATA WHERE TIMESTAMP >= ? AND TIMESTAMP < ? AND COIL_ID IS NOT NULL AND TRIM(COIL_ID) <> '' AND COIL_ID NOT LIKE '0000%' GROUP BY COIL_ID ORDER BY MIN(TIMESTAMP)`, [d0, d1])) as any[];
      const det = (await cl.query(`SELECT coil_id coil, camera_id cam, COUNT(*) n FROM detection_alert WHERE captured_at >= ? AND captured_at < ? AND coil_id IS NOT NULL AND coil_id NOT LIKE '0000%' GROUP BY coil_id, camera_id`, [d0, d1])) as any[];
      const dmap = new Map<string, { surf: number; flat: number }>();
      for (const r of det) { const k = String(r.coil).trim(); const o = dmap.get(k) || { surf: 0, flat: 0 }; if (num(r.cam) === 2) o.flat += num(r.n) || 0; else o.surf += num(r.n) || 0; dmap.set(k, o); }
      const coils = plc.map((r) => String(r.coil).trim()); for (const k of dmap.keys()) if (!coils.includes(k)) coils.push(k);
      const ev = coils.length ? (await cl.query(`SELECT product_name coil, specification spec, company_name cu FROM erp_data WHERE product_name IN (${coils.map(() => "?").join(",")})`, coils)) as any[] : [];
      const emap = new Map<string, any>(); for (const r of ev) emap.set(String(r.coil).trim(), r);
      const out = coils.map((c) => { const p = plc.find((x) => String(x.coil).trim() === c); const dd = dmap.get(c) || { surf: 0, flat: 0 }; const e = emap.get(c); const sp = parseSpec(e?.spec || ""); return { coil: c, st: p?.st ?? null, en: p?.en ?? null, thk: sp.thk, wd: sp.wd, company: e?.cu ?? null, surf: dd.surf, flat: dd.flat, total: dd.surf + dd.flat }; });
      return json({ ok: true, date, coils: out });
    }

    return json({ ok: false, error: "mode=coils|coil|img|vid|flatness|segments|levvid" }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 500); }
  finally { if (cl) try { await cl.close(); } catch (_e) { /* ignore */ } }
});
