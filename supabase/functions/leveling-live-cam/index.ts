// leveling-live-cam (2026-11-05 신규) — 레벨러 품질 카메라 2대 실시간 화면 프록시
//
//  GET ?cam=1|2[&w=640|1024|1600]  → 지금 화면 JPEG (가로 w px로 줄여서 돌려줌)
//
// 왜 필요한가: 카메라 스냅샷은 사내 대시보드(38080, http)가 서명 주소(ohsung-ai.iptime.org:12080, http)로 준다.
//   Vercel 페이지(https)에서는 http 이미지를 바로 못 불러오므로(mixed content) 여기서 받아 https로 넘겨준다.
//   원본은 4096×3000 · 300~470KB라 그대로 넘기면 너무 무거워서 줄여서(약 40~60KB) 보낸다.
// 부담 줄이기: 서명 주소는 만료 2분 전까지 재사용, 같은 카메라·크기 화면은 1.5초 동안 공유(여러 명이 봐도 한 번만 받음).
// 읽기 전용. 비밀값 없음.
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const SRC = "http://osungsteel.servehttp.com:38080";
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "x-frame-at, x-frame-age",
};
const WIDTHS = new Set([640, 1024, 1600]);
const SHARE_MS = 1500;

const signed = new Map<number, { url: string; exp: number }>();
const frames = new Map<string, { t: number; buf: Uint8Array }>();
const inflight = new Map<string, Promise<{ t: number; buf: Uint8Array }>>();

async function signedUrl(cam: number, force = false) {
  const c = signed.get(cam);
  if (!force && c && c.exp * 1000 - Date.now() > 120000) return c.url;
  const r = await fetch(`${SRC}/api/leveling/live/${cam}/stream-url`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`stream-url ${r.status}`);
  const j = await r.json();
  signed.set(cam, { url: j.url, exp: Number(j.expiresAt) || 0 });
  return j.url as string;
}

async function grab(cam: number, w: number) {
  let url = await signedUrl(cam);
  let r = await fetch(`${url}&_=${Date.now()}`, { signal: AbortSignal.timeout(10000) });
  if (r.status === 401 || r.status === 403) { url = await signedUrl(cam, true); r = await fetch(`${url}&_=${Date.now()}`, { signal: AbortSignal.timeout(10000) }); }
  if (!r.ok) throw new Error(`snapshot ${r.status}`);
  const src = new Uint8Array(await r.arrayBuffer());
  const im = await Image.decode(src);
  if (im.width > w) im.resize(w, Image.RESIZE_AUTO);
  const buf = await im.encodeJPEG(72);
  return { t: Date.now(), buf };
}

async function frame(cam: number, w: number) {
  const key = `${cam}:${w}`;
  const f = frames.get(key);
  if (f && Date.now() - f.t < SHARE_MS) return f;
  let p = inflight.get(key);
  if (!p) {
    p = grab(cam, w).then((x) => { frames.set(key, x); return x; }).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return await p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const q = new URL(req.url).searchParams;
  const cam = Number(q.get("cam") || "1");
  const w = WIDTHS.has(Number(q.get("w"))) ? Number(q.get("w")) : 1024;
  if (cam !== 1 && cam !== 2) return new Response(JSON.stringify({ ok: false, error: "cam=1|2" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const f = await frame(cam, w);
    const at = new Date(f.t + 9 * 3600000).toISOString().slice(11, 19); // KST
    return new Response(f.buf, { headers: { ...CORS, "Content-Type": "image/jpeg", "Cache-Control": "no-store", "x-frame-at": at, "x-frame-age": String(Date.now() - f.t) } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
