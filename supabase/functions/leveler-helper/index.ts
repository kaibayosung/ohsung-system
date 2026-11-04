// leveler-helper (2026-11-04 신규) — 레벨러 AI 헬퍼(현장 가로 태블릿) API
//
//  GET  ?mode=state[&asof=YYYY-MM-DD HH:MM:SS]
//       leveling-floor ?mode=live 결과(오늘 작업·실시간 상태·대기 작업)에
//       ① 지금 장비 값(LEVELING_DATA 마지막 행) ② 같은 두께 지난 작업의 셋팅(추천 값) ③ 절단 길이 보정 비율
//       ④ 언코일러 텐션 OCR 마지막 값 ⑤ 오늘 헬퍼 기록 을 붙여 돌려준다. (화면이 15초마다 호출)
//  POST ?mode=event  {coil, box, kind, data, device, asof?}
//       헬퍼 화면에서 누른 기록 저장 → public.leveler_helper_events (RLS 켜짐, 정책 없음 = service role 전용)
//
// 시간 규칙: LEVELING_DATA.TIMESTAMP 는 이미 KST 라 변환하지 않는다. ai_tension_readings.captured_at 만 UTC → +9h.
// 비밀값: DB 접속 정보는 Edge Function 시크릿(LEVELER_DB_*)에서만 읽는다. 읽기 전용(헬퍼 기록 테이블만 쓴다).
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const H = 3600000, MIN = 60000;
const KINDS = new Set(["coil_pick", "notes_read", "order_check", "setting_ack", "alarm_ack", "box_count"]);
const BAD_FLAGS = new Set(["len", "partial", "noerp"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });
}
const kstNow = () => Date.now() + 9 * H;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const hms = (ms: number) => new Date(ms).toISOString().slice(11, 19);
const parseTs = (s: unknown) => (s ? Date.parse(String(s).replace(" ", "T") + "Z") : NaN);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const r1 = (v: number | null) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
function median(a: number[]) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

function sb() { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); }
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

// 지금 장비 값 = LEVELING_DATA 마지막 행 (코일 번호가 안 들어가 있어도 셋팅 값은 보인다)
async function machineNow(asof: string | null) {
  const cl = await db();
  try {
    const sql = `SELECT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d %H:%i:%s') ts, COIL_ID c, BOXIDX b, RUN r, CUTLENSET cut, CUTLENCORR corr,
                        SPEEDSET ss, ACCTM acc, DECTM dece, SLOWLENSET slow, INVERTERSPEEDCOEFF coef, INVERTERSPEEDPER ld
                 FROM LEVELING_DATA ${asof ? "WHERE TIMESTAMP <= ? ORDER BY TIMESTAMP DESC" : "ORDER BY ID DESC"} LIMIT 1`;
    const rows = (await cl.query(sql, asof ? [asof] : [])) as any[];
    const x = rows[0];
    if (!x) return null;
    return { ts: x.ts, coil: String(x.c ?? "").trim(), box: num(x.b), run: num(x.r), cut: num(x.cut), corr: num(x.corr), ss: num(x.ss), acc: num(x.acc), dec: num(x.dece), slow: num(x.slow), coef: num(x.coef), load: num(x.ld) };
  } finally { try { await cl.close(); } catch (_e) { /* ignore */ } }
}

// 같은 두께 지난 작업의 셋팅 — 장수(박스별 PLC 매수)로 가중한 최빈값
type Peer = { date: string; coil: string; thk: number | null; wd: number | null; boxes: any[]; planBoxes: any[]; flags: any[] };
async function loadPeers(): Promise<Peer[]> {
  const { data } = await sb().from("leveling_job_cache")
    .select("work_date, coil_id, thk, boxes:job->boxes, planBoxes:job->planBoxes, flags:job->flags, wd:job->wd")
    .eq("version", "lf2").range(0, 4999);
  return (data || []).map((x: any) => ({ date: x.work_date, coil: x.coil_id, thk: num(x.thk), wd: num(x.wd), boxes: x.boxes || [], planBoxes: x.planBoxes || [], flags: x.flags || [] }));
}
function recFor(all: Peer[], thk: number | null, coil: string, date: string) {
  if (thk == null) return { n: 0 };
  const ok = (p: Peer) => p.thk != null && !(p.coil === coil && p.date === date) && !p.flags.some((f: any) => BAD_FLAGS.has(f?.k));
  let basis = "same";
  let ps = all.filter((p) => ok(p) && Math.abs(p.thk! - thk) <= 0.06);
  if (!ps.length) { basis = "near"; ps = all.filter((p) => ok(p) && Math.abs(p.thk! - thk) <= 0.16); }
  if (!ps.length) return { n: 0 };
  const pick = (key: string, round = 1) => {
    const m = new Map<number, number>(); let tot = 0;
    for (const p of ps) for (const b of p.boxes) {
      const v = num(b?.[key]); if (v == null) continue;
      const k = Math.round(v / round) * round, w = Math.max(1, num(b?.plc) || 0);
      m.set(k, (m.get(k) || 0) + w); tot += w;
    }
    let best: number | null = null, bw = 0; for (const [k, w] of m) if (w > bw) { bw = w; best = k; }
    return best == null ? null : { v: best, share: Math.round(bw / tot * 100), alts: [...m.keys()].sort((a, b) => a - b) };
  };
  const recent = [...ps].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return {
    n: ps.length, basis, thks: [...new Set(ps.map((p) => p.thk))].sort(),
    ss: pick("ss"), acc: pick("acc"), dec: pick("dec"), slow: pick("slow"), coef: pick("coef"),
    last: recent ? { date: recent.date, coil: recent.coil, ss: num(recent.boxes?.[0]?.ss) } : null,
  };
}
// 절단 길이: 지난 작업에서 지시서 길이 대비 장비에 넣은 값의 비율(지시서 ±1% 안의 박스만)
function cutRatio(all: Peer[]) {
  const rs: number[] = [];
  for (const p of all) {
    const plans = p.planBoxes.map((x: any) => num(x?.len)).filter((v: any) => v) as number[];
    for (const b of p.boxes) {
      const set = num(b?.len); if (!set) continue;
      let best: number | null = null; for (const L of plans) if (best == null || Math.abs(L - set) < Math.abs(best - set)) best = L;
      if (best && Math.abs(set / best - 1) <= 0.01) rs.push(set / best);
    }
  }
  const m = median(rs);
  return { ratio: m == null ? null : Math.round(m * 100000) / 100000, n: rs.length };
}

async function lastTension(nowT: number) {
  const { data } = await sb().from("ai_tension_readings")
    .select("captured_at, output_percent, thickness_um, start_dia_mm, parse_ok")
    .eq("parse_ok", true).gt("output_percent", 0).lte("captured_at", new Date(nowT - 9 * H).toISOString())
    .order("captured_at", { ascending: false }).limit(1);
  const x = (data || [])[0];
  if (!x) return null;
  const t = Date.parse(x.captured_at) + 9 * H; // UTC → KST
  return { at: hms(t), ageMin: r1((nowT - t) / MIN), out: num(x.output_percent), thkUm: num(x.thickness_um), dia: num(x.start_dia_mm) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "state";
  try {
    if (mode === "event") {
      if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
      const raw = await req.text();
      if (raw.length > 8000) return json({ ok: false, error: "too large" }, 413);
      const b = JSON.parse(raw || "{}");
      const coil = String(b.coil ?? "").trim().slice(0, 60);
      const kind = String(b.kind ?? "");
      if (!coil || !KINDS.has(kind)) return json({ ok: false, error: "bad coil/kind" }, 400);
      const box = Number.isInteger(b.box) && b.box >= 0 && b.box < 100 ? b.box : null;
      const data = b.data && typeof b.data === "object" && !Array.isArray(b.data) ? b.data : {};
      const asof = typeof b.asof === "string" && /^\d{4}-\d{2}-\d{2}/.test(b.asof) ? b.asof : null;
      const row = { work_date: asof ? asof.slice(0, 10) : ymd(kstNow()), coil, box, kind, data, device: String(b.device ?? "").slice(0, 40) || null, test: !!asof || !!b.test };
      const { data: ins, error } = await sb().from("leveler_helper_events").insert(row).select("id, created_at").single();
      if (error) throw new Error(error.message);
      return json({ ok: true, id: ins.id, created_at: ins.created_at });
    }

    // ---- state ----
    const asof = url.searchParams.get("asof");
    const nowT = asof ? parseTs(asof) : kstNow();
    const today = ymd(nowT);
    const base = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const floorUrl = `${base}/functions/v1/leveling-floor?mode=live${asof ? "&asof=" + encodeURIComponent(asof) : ""}`;
    const [floorRes, machine, peers, tension, evRes] = await Promise.all([
      fetch(floorUrl, { headers: anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {} }).then((r) => r.json()),
      machineNow(asof).catch((e) => ({ error: String(e?.message || e) })),
      loadPeers(),
      lastTension(nowT).catch(() => null),
      sb().from("leveler_helper_events").select("id, created_at, coil, box, kind, data, test").eq("work_date", today).order("id").limit(1000),
    ]);
    const floor = floorRes || {};
    const rec: Record<string, unknown> = {};
    for (const j of floor.jobs || []) rec[j.coil] = recFor(peers, j.thk ?? null, j.coil, j.date || today);
    for (const w of floor.waiting || []) if (!rec[w.coil]) rec[w.coil] = recFor(peers, w.thk ?? null, w.coil, today);
    const events = (evRes.data || []).filter((e: any) => (asof ? true : !e.test));
    return json({ ok: !!floor.ok, now: hms(nowT), today, asof: asof || null, floor, machine, rec, cut: cutRatio(peers), tension, events, floorError: floor.ok ? null : floor.error || null });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
