// leveling-quality (2026-11-06 신규) — 레벨링 품질 결함 지도 API (실데이터 연동)
//
//  GET ?mode=coils[&date=YYYY-MM-DD]   → 그 날 작업한 코일 목록 + 결함 수(표면/편탄도)
//  GET ?mode=coil&coil=XXX[&date=…]    → 코일 상세: 박스별 장수 + 결함(박스·장표 환산, 표면 roi / 편탄도 좌중우)
//  GET ?mode=img&id=N                  → detection_alert 사진 프록시(38080, http→https)
//
// 데이터: LEVELING_DATA(박스·장수, MOVELENSV 리셋) · detection_alert(결함: camera_id 1=표면/2=편탄도, score,
//   threshold, roi_x·y·w·h, image_path, box_idx, segment_id, video_ms, human_label) · inference_score_log(편탄도 edge_l·center·edge_r)
//   · erp_data(규격·고객). v1.1 컬럼 기준(2026-11-05). 읽기 전용.
// 시간: LEVELING_DATA.TIMESTAMP 는 KST 벽시계. detection_alert.captured_at 도 같은 벽시계로 보고 매칭한다
//   (어긋나면 ?tzmin=분 으로 보정; 데이터 적재 후 검증 필요).
// 비밀값: DB 접속은 Edge Function 시크릿(LEVELER_DB_*)에서만 읽는다.
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const SRC = "http://osungsteel.servehttp.com:38080";
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const MIN = 60000;
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const tms = (s: unknown) => (s ? Date.parse(String(s).replace(" ", "T") + "Z") : NaN);
const kstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

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
function parseSpec(s: string) {
  // 예: "0.5X962XC" → thk 0.5, wd 962
  const m = String(s || "").toUpperCase().replace(/\s/g, "").match(/^([\d.]+)X(\d+)/);
  return m ? { thk: num(m[1]), wd: num(m[2]) } : { thk: null, wd: null };
}

// 박스·장 계산: MOVELENSV 리셋 = 한 장. BOXIDX 2개 이상이면 그대로, 아니면 절단길이 바뀌는 곳에서 박스 나눔.
function buildBoxes(rows: Array<{ t: number; b: number | null; cut: number; mv: number }>) {
  const sh: Array<{ t: number; len: number; box: number | null }> = [];
  for (let i = 1; i < rows.length; i++) {
    const p = rows[i - 1], r = rows[i];
    if (p.mv - r.mv > 100 && p.cut >= 100 && p.cut < 20000) sh.push({ t: r.t, len: p.cut, box: p.b });
  }
  if (!sh.length) return { groups: [] as Array<{ key: number | null; cut: number; sheets: number[] }>, sheetMap: [] as Array<{ t: number; g: number; pos: number }> };
  const boxVals = new Set(sh.filter((s) => s.box != null && s.box > 0).map((s) => s.box));
  const useBox = boxVals.size >= 2;
  const groups: Array<{ key: number | null; cut: number; sheets: number[] }> = [];
  let g: any = null, lastLen = 0;
  const sheetMap: Array<{ t: number; g: number; pos: number }> = [];
  for (const s of sh) {
    const isNew = !g || (useBox ? s.box !== g.key : Math.abs(s.len - lastLen) > 3);
    if (isNew) { g = { key: useBox ? s.box : null, cut: s.len, sheets: [] }; groups.push(g); }
    g.sheets.push(s.t); lastLen = s.len;
    sheetMap.push({ t: s.t, g: groups.length - 1, pos: g.sheets.length });
  }
  return { groups, sheetMap, useBox };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const q = new URL(req.url).searchParams;
  const mode = q.get("mode") || "coils";

  // 사진 프록시
  if (mode === "img") {
    const id = (q.get("id") || "").replace(/[^0-9]/g, "");
    if (!id) return json({ ok: false, error: "id 필요" }, 400);
    try {
      const r = await fetch(`${SRC}/api/leveling/detections/${id}/image`, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) return json({ ok: false, error: `image ${r.status}` }, 502);
      return new Response(r.body, { headers: { ...CORS, "Content-Type": r.headers.get("content-type") || "image/jpeg", "Cache-Control": "public, max-age=120" } });
    } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 502); }
  }

  const date = (q.get("date") || kstToday()).slice(0, 10);
  const tzmin = num(q.get("tzmin")) || 0;
  const d0 = date + " 00:00:00", d1 = addDays(date, 1) + " 00:00:00";
  let cl: Client | null = null;
  try {
    cl = await db();

    if (mode === "coils") {
      const plc = (await cl.query(
        `SELECT COIL_ID coil, DATE_FORMAT(MIN(TIMESTAMP),'%H:%i') st, DATE_FORMAT(MAX(TIMESTAMP),'%H:%i') en, COUNT(*) n
         FROM LEVELING_DATA WHERE TIMESTAMP >= ? AND TIMESTAMP < ? AND COIL_ID IS NOT NULL AND TRIM(COIL_ID) <> '' AND COIL_ID NOT LIKE '0000%'
         GROUP BY COIL_ID ORDER BY MIN(TIMESTAMP)`, [d0, d1])) as any[];
      const det = (await cl.query(
        `SELECT coil_id coil, camera_id cam, COUNT(*) n FROM detection_alert
         WHERE captured_at >= ? AND captured_at < ? AND coil_id IS NOT NULL GROUP BY coil_id, camera_id`, [d0, d1])) as any[];
      const dmap = new Map<string, { surf: number; flat: number }>();
      for (const r of det) { const k = String(r.coil).trim(); const o = dmap.get(k) || { surf: 0, flat: 0 }; if (num(r.cam) === 2) o.flat += num(r.n) || 0; else o.surf += num(r.n) || 0; dmap.set(k, o); }
      const coils = plc.map((r) => String(r.coil).trim());
      for (const k of dmap.keys()) if (!coils.includes(k)) coils.push(k);
      // ERP 규격·고객
      const ev = coils.length ? (await cl.query(
        `SELECT product_name coil, specification spec, company_name cu FROM erp_data WHERE product_name IN (${coils.map(() => "?").join(",")})`, coils)) as any[] : [];
      const emap = new Map<string, any>(); for (const r of ev) emap.set(String(r.coil).trim(), r);
      const out = coils.map((c) => {
        const p = plc.find((x) => String(x.coil).trim() === c);
        const dd = dmap.get(c) || { surf: 0, flat: 0 };
        const e = emap.get(c); const sp = parseSpec(e?.spec || "");
        return { coil: c, st: p?.st ?? null, en: p?.en ?? null, thk: sp.thk, wd: sp.wd, company: e?.cu ?? null, surf: dd.surf, flat: dd.flat, total: dd.surf + dd.flat };
      });
      return json({ ok: true, date, coils: out });
    }

    if (mode === "coil") {
      const coil = (q.get("coil") || "").trim();
      if (!coil) return json({ ok: false, error: "coil 필요" }, 400);
      // 코일 작업일(안 주면 최근 작업일 찾기)
      let wdate = date;
      if (!q.get("date")) {
        const w = (await cl.query(`SELECT DATE_FORMAT(MAX(TIMESTAMP),'%Y-%m-%d') d FROM LEVELING_DATA WHERE COIL_ID = ?`, [coil])) as any[];
        if (w[0]?.d) wdate = w[0].d;
      }
      const w0 = wdate + " 00:00:00", w1 = addDays(wdate, 1) + " 00:00:00";
      const rows = ((await cl.query(
        `SELECT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d %H:%i:%s') ts, BOXIDX b, CUTLENSET cut, MOVELENSV mv
         FROM LEVELING_DATA WHERE COIL_ID = ? AND TIMESTAMP >= ? AND TIMESTAMP < ? ORDER BY TIMESTAMP, ID`, [coil, w0, w1])) as any[])
        .map((x) => ({ t: tms(x.ts), b: x.b == null ? null : num(x.b), cut: num(x.cut) || 0, mv: num(x.mv) || 0 }));
      const { groups, sheetMap } = buildBoxes(rows);
      const sizes = groups.map((g) => g.sheets.length);
      const starts: number[] = []; let acc = 0; for (const s of sizes) { starts.push(acc); acc += s; }
      const boxes = sizes.map((sz, i) => ({ n: i + 1, size: sz, s1: starts[i] + 1, s2: starts[i] + sz, cut: groups[i].cut }));

      // 결함
      const det = (await cl.query(
        `SELECT id, ai_alert_id aid, camera_id cam, DATE_FORMAT(captured_at,'%Y-%m-%d %H:%i:%s') cap, metric, score, threshold thr,
                image_path img, roi_x, roi_y, roi_w, roi_h, box_idx, segment_id seg, video_ms vms, human_label hl
         FROM detection_alert WHERE coil_id = ? AND captured_at >= ? AND captured_at < ? ORDER BY captured_at`, [coil, w0, w1])) as any[];
      // 편탄도 좌중우 (camera 2)
      const edg = (await cl.query(
        `SELECT DATE_FORMAT(captured_at,'%Y-%m-%d %H:%i:%s') cap, edge_l el, center ce, edge_r er
         FROM inference_score_log WHERE coil_id = ? AND camera_id = 2 AND captured_at >= ? AND captured_at < ? AND edge_l IS NOT NULL
         ORDER BY captured_at`, [coil, w0, w1])) as any[];
      const edgeRows = edg.map((r) => ({ t: tms(r.cap), el: num(r.el), ce: num(r.ce), er: num(r.er) }));
      const nearestEdge = (cap: number) => {
        let best: any = null, bg = Infinity;
        for (const e of edgeRows) { const g = Math.abs(e.t - cap); if (g < bg) { bg = g; best = e; } }
        return best && bg < 120000 ? best : null;
      };
      const nearestSheet = (cap: number, boxIdx: number | null) => {
        // box_idx 매칭 그룹 우선
        let cand = sheetMap;
        if (boxIdx != null && boxIdx > 0) {
          const gi = groups.findIndex((g) => g.key === boxIdx);
          if (gi >= 0) cand = sheetMap.filter((s) => s.g === gi);
        }
        let best: any = null, bg = Infinity;
        for (const s of cand) { const g = Math.abs(s.t - cap); if (g < bg) { bg = g; best = s; } }
        return best ? { box: best.g + 1, sheet: best.pos, abs: starts[best.g] + best.pos, gapMin: Math.round(bg / MIN) } : null;
      };

      // 연속 프레임을 하나의 결함으로 묶기 (같은 카메라, 간격 < GAP). AI는 같은 결함을 매 프레임 올려서 수천 건이 됨.
      const GAP = 4000;
      type Cl = { cam: number; n: number; firstCap: number; lastCap: number; peakScore: number; peak: any; peakCap: number };
      const clusters: Cl[] = [];
      let cur: Cl | null = null;
      for (const r of det) {
        const cam = num(r.cam) || 0, cap = tms(r.cap), sc = num(r.score) ?? 0;
        if (cur && cur.cam === cam && cap - cur.lastCap < GAP) {
          cur.n++; cur.lastCap = cap;
          if (sc > cur.peakScore) { cur.peakScore = sc; cur.peak = r; cur.peakCap = cap; }
        } else { if (cur) clusters.push(cur); cur = { cam, n: 1, firstCap: cap, lastCap: cap, peakScore: sc, peak: r, peakCap: cap }; }
      }
      if (cur) clusters.push(cur);
      clusters.sort((a, b) => a.peakCap - b.peakCap);
      const MAXD = 400;
      const rnd = (v: number | null, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

      const defects = clusters.slice(0, MAXD).map((c) => {
        const r = c.peak, cap = c.peakCap + tzmin * MIN, cam = c.cam;
        const sm = nearestSheet(cap, num(r.box_idx));
        let kind = cam === 2 ? "fl" : "sf";
        let edge: (number | null)[] | null = null;
        if (cam === 2) {
          const e = nearestEdge(cap);
          if (e) {
            edge = [rnd(e.el, 1), rnd(e.ce, 1), rnd(e.er, 1)];
            const tilt = Math.abs((e.er ?? 0) - (e.el ?? 0));
            const centerHi = (e.ce ?? 0) >= (e.el ?? 0) && (e.ce ?? 0) >= (e.er ?? 0);
            kind = tilt >= 8 ? "ew" : (centerHi ? "cb" : "ew");
          }
        }
        return {
          id: num(r.id), aid: num(r.aid), cam, kind, at: r.cap, n: c.n, durSec: Math.round((c.lastCap - c.firstCap) / 1000),
          box: sm?.box ?? num(r.box_idx), sheet: sm?.sheet ?? null, abs: sm?.abs ?? null, gapMin: sm?.gapMin ?? null,
          score: rnd(num(r.score), cam === 2 ? 1 : 3), warp: cam === 2 ? rnd(num(r.score), 1) : null, thr: num(r.thr),
          roi: (r.roi_x != null) ? { x: rnd(num(r.roi_x), 3), y: rnd(num(r.roi_y), 3), w: rnd(num(r.roi_w), 3), h: rnd(num(r.roi_h), 3) } : null,
          edge, seg: r.seg ?? null, vms: num(r.vms), hasImg: !!r.img, label: r.hl ?? null,
        };
      });

      // ERP 규격
      const e = ((await cl.query(`SELECT specification spec, company_name cu FROM erp_data WHERE product_name = ? LIMIT 1`, [coil])) as any[])[0];
      const sp = parseSpec(e?.spec || "");
      const surf = defects.filter((d) => d.cam !== 2).length, flat = defects.filter((d) => d.cam === 2).length;
      return json({
        ok: true, coil, date: wdate, thk: sp.thk, wd: sp.wd, company: e?.cu ?? null,
        sheets: acc, boxesN: sizes.length, boxes, defects, surf, flat, total: defects.length,
        rawAlerts: det.length, clustered: clusters.length,
        note: rows.length ? null : "이 코일의 PLC 데이터가 없습니다(장수 환산 불가).",
      });
    }

    return json({ ok: false, error: "mode=coils|coil|img" }, 400);
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  } finally { if (cl) try { await cl.close(); } catch (_e) { /* ignore */ } }
});
