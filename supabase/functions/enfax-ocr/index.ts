// enfax-ocr: 엔팩스 받은팩스 TIFF 원본을 다운로드해 PNG로 변환한 뒤 Claude Vision으로
// 발주 상세를 구조화된 JSON으로 추출합니다.
//
// [v4] 브라우저(SalesWorkflowPage.jsx)에서 직접 fetch()로 호출하는데 CORS 헤더와
// OPTIONS 프리플라이트 처리가 없어 브라우저가 응답을 차단하면서 "Failed to fetch"가 발생하던
// 문제를 수정함 (Claude API 크레딧/과금 문제가 아니라 순수 CORS 누락 문제였음).
//
// [중요] enfax-sync와 동일한 enfax_session 테이블을 공유해서 세션을 재사용합니다.
// 매번 새로 로그인하면 엔팩스가 "새로운 환경에서 로그인" 알림 메일을 보내기 때문입니다.
//
// 호출: GET /enfax-ocr?filePath=/EnUserData/fax/receive/5/5/xxxx.tif
//
// ENFAX_USER / ENFAX_PASS / ANTHROPIC_API_KEY 는 Supabase Edge Function Secrets 로만 저장되어 있으며 이 코드에는 평문 값이 없습니다.

import UTIF from "npm:utif2@4";
import { PNG } from "npm:pngjs@7";
import { Buffer } from "node:buffer";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ENFAX_BASE = "https://www.enfax.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SESSION_MAX_AGE_MS = 6 * 3600 * 1000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function extractSetCookies(headers: Headers): string[] {
  // deno-lint-ignore no-explicit-any
  const anyHeaders = headers as any;
  if (typeof anyHeaders.getSetCookie === "function") {
    const arr = anyHeaders.getSetCookie();
    if (Array.isArray(arr) && arr.length > 0) return arr;
  }
  const raw = headers.get("set-cookie");
  if (!raw) return [];
  return raw.split(/,(?=[^ ]+=)/);
}

function mergeCookies(jar: Map<string, string>, setCookies: string[]) {
  for (const sc of setCookies) {
    const pair = sc.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function loadCachedSession(supabase: any): Promise<{ jar: Map<string, string>; csrfToken: string } | null> {
  const { data } = await supabase.from("enfax_session").select("*").eq("id", 1).maybeSingle();
  if (!data) return null;
  const ageMs = Date.now() - new Date(data.updated_at).getTime();
  if (ageMs > SESSION_MAX_AGE_MS) return null;
  const jar = new Map<string, string>(Object.entries(data.cookie_jar || {}));
  if (jar.size === 0) return null;
  return { jar, csrfToken: data.csrf_token };
}

async function saveSession(supabase: any, jar: Map<string, string>, csrfToken: string) {
  const obj = Object.fromEntries(jar.entries());
  await supabase.from("enfax_session").upsert({ id: 1, cookie_jar: obj, csrf_token: csrfToken, updated_at: new Date().toISOString() });
}

async function verifySession(jar: Map<string, string>, csrfToken: string): Promise<boolean> {
  try {
    const url = `${ENFAX_BASE}/fax/receive-box?faxReceiveSaveType=RECEIVE&recordCount=1&pageNo=1&pageSize=1`;
    const res = await fetch(url, {
      headers: {
        "Cookie": cookieHeader(jar),
        "X-Csrf-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json",
        "User-Agent": UA,
      },
    });
    if (!res.ok) return false;
    const json = await res.json();
    return String(json.resCd) === "200";
  } catch (_e) {
    return false;
  }
}

async function freshLogin(): Promise<{ jar: Map<string, string>; csrfToken: string }> {
  const user = Deno.env.get("ENFAX_USER") || "";
  const pass = Deno.env.get("ENFAX_PASS") || "";
  if (!user || !pass) {
    throw new Error("ENFAX_USER / ENFAX_PASS 시크릿이 설정되어 있지 않습니다.");
  }

  const jar = new Map<string, string>();

  const initRes = await fetch(`${ENFAX_BASE}/fax/view/receive`, { headers: { "User-Agent": UA } });
  mergeCookies(jar, extractSetCookies(initRes.headers));
  const initHtml = await initRes.text();
  const initCsrfMatch = initHtml.match(/name="_csrf"\s+value="([^"]+)"/) || initHtml.match(/name="_csrf" content="([^"]+)"/);
  if (!initCsrfMatch) throw new Error("초기 CSRF 토큰을 찾을 수 없습니다.");
  const loginCsrf = initCsrfMatch[1];

  const loginRes = await fetch(`${ENFAX_BASE}/common/loginAct`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookieHeader(jar),
      "User-Agent": UA,
    },
    body: new URLSearchParams({ userId: user, userPwd: pass, _csrf: loginCsrf }).toString(),
  });
  mergeCookies(jar, extractSetCookies(loginRes.headers));

  const afterRes = await fetch(`${ENFAX_BASE}/fax/view/receive`, { headers: { "Cookie": cookieHeader(jar), "User-Agent": UA } });
  mergeCookies(jar, extractSetCookies(afterRes.headers));
  const afterHtml = await afterRes.text();

  if (afterHtml.includes('name="userPwd"') || afterHtml.includes('id="loginForm"')) {
    throw new Error("로그인 실패: 아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const csrf2 = afterHtml.match(/name="_csrf" content="([^"]+)"/);
  const csrfToken = csrf2 ? csrf2[1] : loginCsrf;

  return { jar, csrfToken };
}

async function enfaxLogin(supabase: any): Promise<{ jar: Map<string, string>; csrfToken: string }> {
  const cached = await loadCachedSession(supabase);
  if (cached && (await verifySession(cached.jar, cached.csrfToken))) {
    return cached;
  }
  const fresh = await freshLogin();
  await saveSession(supabase, fresh.jar, fresh.csrfToken);
  return fresh;
}

async function downloadTiff(jar: Map<string, string>, filePath: string): Promise<ArrayBuffer> {
  const url = `${ENFAX_BASE}/file/download?filePath=${encodeURIComponent(filePath)}`;
  const res = await fetch(url, {
    headers: {
      "Cookie": cookieHeader(jar),
      "User-Agent": UA,
      "Accept": "application/json, text/plain, */*",
      "Referer": `${ENFAX_BASE}/fax/preview`,
    },
  });
  if (!res.ok) throw new Error(`파일 다운로드 HTTP 오류: ${res.status}`);
  return await res.arrayBuffer();
}

function tiffFirstPageToPngBase64(tiffBuffer: ArrayBuffer): { base64: string; width: number; height: number } {
  const ifds = UTIF.decode(tiffBuffer);
  if (!ifds || ifds.length === 0) throw new Error("TIFF 디코딩 실패: 페이지를 찾을 수 없습니다.");
  const page = ifds[0];
  UTIF.decodeImage(tiffBuffer, page, ifds);
  const rgba = UTIF.toRGBA8(page);
  const width = page.width;
  const height = page.height;
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);
  const buf = PNG.sync.write(png);
  return { base64: buf.toString("base64"), width, height };
}

// [2026-10-20 비용 절감] 기본 모델 claude-sonnet-4-5 → claude-haiku-5-5
//  (Sonnet 4.5 입력 $3 / 출력 $15 → Haiku 5.5 입력 $0.10 / 출력 $0.50 per 1M, 약 1/30).
//  - Haiku 5.5는 adaptive thinking이 기본 ON이라 thinking을 끄고 effort=low로 둡니다.
//  - Haiku 결과가 JSON으로 읽히지 않거나 호출이 실패하면 1회만 Sonnet 5로 재시도합니다.
const PRIMARY_MODEL = "claude-haiku-5-5";
const FALLBACK_MODEL = "claude-sonnet-5";

// content 배열에 thinking 블록이 섞일 수 있어 content[0].text 대신 text 블록만 모읍니다.
function extractText(data: any): string {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b: any) => b && b.type === "text" && typeof b.text === "string")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

// 코드블록(```json)이나 앞뒤 설명이 붙어도 첫 '{' ~ 마지막 '}'만 잘라 파싱합니다.
function parseJsonLoose(text: string): any {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new Error("JSON 파싱 실패: " + text.slice(0, 300));
  }
}

async function visionOnce(
  apiKey: string, model: string, base64: string, mediaType: string, prompt: string, maxTokens: number, cheap: boolean,
): Promise<any> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  };
  if (cheap) {
    body.thinking = { type: "disabled" };
    body.output_config = { effort: "low" };
  }
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Claude API 오류 (${model}, ${resp.status}): ${errText.slice(0, 500)}`);
  }
  const json = await resp.json();
  // 크레딧 추적용: Edge Function 로그에 모델·토큰 사용량을 남깁니다.
  console.log("usage", JSON.stringify({ model, usage: json?.usage }));
  return parseJsonLoose(extractText(json));
}

async function visionWithFallback(
  base64: string, mediaType: string, prompt: string, maxTokens: number,
): Promise<{ extracted: any; model: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 시크릿이 설정되어 있지 않습니다.");
  try {
    const extracted = await visionOnce(apiKey, PRIMARY_MODEL, base64, mediaType, prompt, maxTokens, true);
    return { extracted, model: PRIMARY_MODEL };
  } catch (e) {
    console.warn("Haiku 판독 실패 → Sonnet 재시도:", String((e as Error)?.message || e));
  }
  const extracted = await visionOnce(apiKey, FALLBACK_MODEL, base64, mediaType, prompt, maxTokens + 2000, false);
  return { extracted, model: FALLBACK_MODEL };
}

async function callClaudeVision(pngBase64: string): Promise<{ extracted: any; model: string }> {
  const prompt = `이 이미지는 철강 코일 거래처가 팩스로 보낸 발주서(주문서) 스캔본입니다. 내용을 읽고 아래 JSON 형식으로만 응답하세요 (설명, 코드블록, 다른 텍스트 없이 순수 JSON만):
{
  "company_name": "발주 거래처명 (회사명, 모르면 null)",
  "due_date": "희망납기일 YYYY-MM-DD 형식 (모르면 null)",
  "phone": "연락처 (모르면 null)",
  "memo": "특이사항/비고 (없으면 null)",
  "items": [
    { "thick": "두께(mm, 숫자만)", "width": "폭(mm, 숫자만)", "weight": "중량(kg, 숫자만)", "maker": "제조사/메이커", "slit": "슬릿규격(예: 260*4, 175*1)", "qty": "수량" }
  ]
}
값을 확신할 수 없거나 문서에 없으면 반드시 null로 두고, 추측해서 지어내지 마세요. items는 문서에 보이는 항목 수만큼 배열로 넣어주세요.`;

  return await visionWithFallback(pngBase64, "image/png", prompt, 1500);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const filePath = url.searchParams.get("filePath") || "";
  const result: Record<string, any> = { filePath };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (!filePath) throw new Error("filePath 파라미터가 필요합니다.");

    const { jar, csrfToken } = await enfaxLogin(supabase);
    result.loginOk = true;

    const tiffBuffer = await downloadTiff(jar, filePath);
    result.tiffBytes = tiffBuffer.byteLength;

    const { base64: pngBase64, width, height } = tiffFirstPageToPngBase64(tiffBuffer);
    result.imageSize = { width, height };

    const { extracted, model } = await callClaudeVision(pngBase64);
    result.extracted = extracted;
    result.model = model;
    result.ok = true;

    return new Response(JSON.stringify(result, null, 1), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  } catch (err) {
    result.ok = false;
    result.error = String((err as Error)?.message || err);
    return new Response(JSON.stringify(result, null, 1), { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
});
