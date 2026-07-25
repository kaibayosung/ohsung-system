// enfax-inbound-daily v11: [작업 내역(작업지시서 상세) FAX 리포트 신규 데이터 모델 반영]
// reportType 파라미터로 "inbound"(입고 내역, 기본값) / "work"(작업 내역)를 선택합니다.
// 작업 내역은 greenp_joborder_detail(작업일자/품명/규격/원중량/중량/작업SIZE) 기준으로,
// CustomerPortalPage.jsx의 "작업 내역" 탭 화면과 동일한 데이터를 사용합니다.
// enFax 계정의 반복 로그인으로 인해 enFax측 로그인 보안이 강화되는 문제가 있어,
// 5분마다 서버가 자동으로 로그인 시도를 하던 예약전송(check-schedule) 기능은 완전히 제거되어 있습니다.
// 이 함수는 (1) 즉시 1회 발송(step=send), (2) PDF 미리보기(step=pdf), (3) 변환 폴링(step=poll) 만 지원합니다.
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
async function loadCachedSession(supabase: any) {
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
    const res = await fetch(url, { headers: { "Cookie": cookieHeader(jar), "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest", "Accept": "application/json", "User-Agent": UA } });
    if (!res.ok) return false;
    const json = await res.json();
    return String(json.resCd) === "200";
  } catch (_e) { return false; }
}
async function freshLogin() {
  const user = Deno.env.get("ENFAX_USER") || "";
  const pass = Deno.env.get("ENFAX_PASS") || "";
  if (!user || !pass) throw new Error("ENFAX_USER / ENFAX_PASS 없음");
  const jar = new Map<string, string>();
  const initRes = await fetch(`${ENFAX_BASE}/fax/view/receive`, { headers: { "User-Agent": UA } });
  mergeCookies(jar, extractSetCookies(initRes.headers));
  const initHtml = await initRes.text();
  const initCsrfMatch = initHtml.match(/name="_csrf"\s+value="([^"]+)"/) || initHtml.match(/name="_csrf" content="([^"]+)"/);
  if (!initCsrfMatch) throw new Error("초기 CSRF 토큰 없음");
  const loginCsrf = initCsrfMatch[1];
  const loginRes = await fetch(`${ENFAX_BASE}/common/loginAct`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": cookieHeader(jar), "User-Agent": UA }, body: new URLSearchParams({ userId: user, userPwd: pass, _csrf: loginCsrf }).toString() });
  mergeCookies(jar, extractSetCookies(loginRes.headers));
  const afterRes = await fetch(`${ENFAX_BASE}/fax/view/receive`, { headers: { "Cookie": cookieHeader(jar), "User-Agent": UA } });
  mergeCookies(jar, extractSetCookies(afterRes.headers));
  const afterHtml = await afterRes.text();
  if (afterHtml.includes('name="userPwd"') || afterHtml.includes('id="loginForm"')) throw new Error("로그인 실패");
  const csrf2 = afterHtml.match(/name="_csrf" content="([^"]+)"/);
  const csrfToken = csrf2 ? csrf2[1] : loginCsrf;
  return { jar, csrfToken };
}
async function enfaxLogin(supabase: any) {
  const cached = await loadCachedSession(supabase);
  if (cached && (await verifySession(cached.jar, cached.csrfToken))) return { ...cached, reused: true };
  const fresh = await freshLogin();
  await saveSession(supabase, fresh.jar, fresh.csrfToken);
  return { ...fresh, reused: false };
}

function seoulDateStr(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}

let cachedFontB64: string | null = null;
async function getKrFontB64(supabase: any): Promise<string> {
  if (cachedFontB64) return cachedFontB64;
  const { data, error } = await supabase.from("app_assets").select("content_b64").eq("key", "ohsung-kr-font").single();
  if (error || !data) throw new Error("한글 폰트 로드 실패: " + (error?.message || "not found"));
  cachedFontB64 = data.content_b64 as string;
  return cachedFontB64;
}

let cachedLogoB64: string | null = null;
async function getLogoB64(supabase: any): Promise<string> {
  if (cachedLogoB64) return cachedLogoB64;
  const { data, error } = await supabase.from("app_assets").select("content_b64").eq("key", "ohsung-logo-jpg").single();
  if (error || !data) throw new Error("로고 로드 실패: " + (error?.message || "not found"));
  cachedLogoB64 = data.content_b64 as string;
  return cachedLogoB64;
}

const NAVY: [number, number, number] = [22, 40, 63];
const DARK: [number, number, number] = [15, 30, 51];
const GRAY_SUB: [number, number, number] = [133, 146, 166];
const BADGE_BG: [number, number, number] = [253, 236, 214];
const BADGE_TX: [number, number, number] = [196, 107, 6];
const META_BG: [number, number, number] = [244, 246, 250];
const META_TX: [number, number, number] = [77, 92, 114];
const ALT_ROW: [number, number, number] = [247, 249, 252];
const BORDER: [number, number, number] = [227, 232, 240];

async function buildInboundPdf(supabase: any, companyName: string, dateLabel: string, rows: { inbound_date: string; product_name: string; spec: string; length_m: string | null; weight: number }[]): Promise<Uint8Array> {
  const { jsPDF } = await import("npm:jspdf@2.5.2");
  const [krFont, logoB64] = await Promise.all([getKrFontB64(supabase), getLogoB64(supabase)]);
  const doc = new jsPDF();
  doc.addFileToVFS("ohsung-kr.ttf", krFont);
  doc.addFont("ohsung-kr.ttf", "OhsungKR", "normal");

  const pageW = 210, marginX = 15, right = 210 - marginX;

  const drawHeader = () => {
    doc.addImage("data:image/jpeg;base64," + logoB64, "JPEG", marginX, 13, 30, 9.83);
    doc.setFont("OhsungKR", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY_SUB);
    doc.text("SMART ERP 2.0", marginX + 34, 20);

    doc.setFontSize(8); doc.setTextColor(...GRAY_SUB);
    doc.text("발행일시", right, 16, { align: "right" });
    doc.setFontSize(9.5); doc.setTextColor(...NAVY);
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    doc.text(now, right, 21, { align: "right" });

    doc.setDrawColor(...NAVY); doc.setLineWidth(0.9);
    doc.line(marginX, 26, right, 26);
  };

  drawHeader();

  doc.setFont("OhsungKR", "normal"); doc.setFontSize(22); doc.setTextColor(...DARK);
  doc.text("입 고 현 황 리 스 트", pageW / 2, 39, { align: "center" });

  const badgeW = 46, badgeH = 7, badgeX = pageW / 2 - badgeW / 2, badgeY = 44;
  doc.setFillColor(...BADGE_BG);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3.5, 3.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...BADGE_TX);
  doc.text("INBOUND COIL LIST", pageW / 2, badgeY + 4.8, { align: "center" });

  const metaY = 56;
  doc.setFillColor(...META_BG);
  doc.roundedRect(marginX, metaY, right - marginX, 10, 2, 2, "F");
  doc.setFont("OhsungKR", "normal"); doc.setFontSize(9.5); doc.setTextColor(...META_TX);
  doc.text(`거래처: ${companyName}`, marginX + 5, metaY + 6.5);
  doc.text(`기간: ${dateLabel}`, pageW / 2, metaY + 6.5, { align: "center" });
  doc.text(`건수: ${rows.length}건`, right - 5, metaY + 6.5, { align: "right" });

  let y = metaY + 18;
  const colX = { date: marginX + 3, name: marginX + 36, spec: marginX + 76, length: marginX + 116, weight: right - 3 };

  const drawTableHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(marginX, y, right - marginX, 8, "F");
    doc.setFont("OhsungKR", "normal"); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
    doc.text("입고일자", colX.date, y + 5.5);
    doc.text("품명", colX.name, y + 5.5);
    doc.text("규격", colX.spec, y + 5.5);
    doc.text("길이", colX.length, y + 5.5);
    doc.text("중량(kg)", colX.weight, y + 5.5, { align: "right" });
    y += 8;
  };

  drawTableHeader();

  let total = 0;
  doc.setFontSize(9.5);
  if (rows.length === 0) {
    doc.setFont("OhsungKR", "normal"); doc.setTextColor(...GRAY_SUB);
    doc.text("입고 내역이 없습니다", pageW / 2, y + 6, { align: "center" });
    y += 9;
  }
  rows.forEach((r, i) => {
    const rowH = 7;
    if (y + rowH > 275) {
      doc.addPage();
      y = 20;
      drawHeader();
      y = 32;
      drawTableHeader();
    }
    if (i % 2 === 1) { doc.setFillColor(...ALT_ROW); doc.rect(marginX, y, right - marginX, rowH, "F"); }
    doc.setFont("OhsungKR", "normal"); doc.setTextColor(...DARK);
    doc.text(String(r.inbound_date ?? ""), colX.date, y + 5);
    doc.text(String(r.product_name ?? ""), colX.name, y + 5);
    doc.text(String(r.spec ?? ""), colX.spec, y + 5);
    doc.text(String(r.length_m ?? "" ) || "-", colX.length, y + 5);
    doc.text(Number(r.weight || 0).toLocaleString(), colX.weight, y + 5, { align: "right" });
    total += Number(r.weight) || 0;
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.15);
    doc.line(marginX, y + rowH, right, y + rowH);
    y += rowH;
  });

  y += 2;
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.6);
  doc.line(marginX, y, right, y);
  y += 7;
  doc.setFont("OhsungKR", "normal"); doc.setFontSize(11.5); doc.setTextColor(...DARK);
  doc.text("중량 합계", right - 40, y, { align: "right" });
  doc.text(`${total.toLocaleString()} kg`, right, y, { align: "right" });

  y += 14;
  doc.setFont("OhsungKR", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY_SUB);
  doc.text("본 리스트는 오성철강 스마트 이알피에서 자동 생성되었습니다.", marginX, y);
  y += 5;
  doc.text("내용에 이상이 있으신 경우 오성철강사로 연락 주시기 바랍니다.", marginX, y);

  y += 18;
  doc.setFont("OhsungKR", "normal"); doc.setFontSize(13); doc.setTextColor(...DARK);
  doc.text("오 성 철 강 사", right, y, { align: "right" });

  return new Uint8Array(doc.output("arraybuffer"));
}

/* ---------------- 작업 내역(작업지시서 상세) PDF — 입고 리포트와 동일 양식 ----------------
 * greenp_joborder_detail 기준: 작업일자/품명/규격/원중량/중량/작업SIZE
 * (CustomerPortalPage.jsx "작업 내역" 탭과 동일 데이터/컬럼) */
async function fetchWorkRows(supabase: any, companyName: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("greenp_joborder_detail")
    .select("joborder_date,product_name,spec,original_weight,used_weight,process_rule")
    .eq("company_name", companyName)
    .gte("joborder_date", startDate)
    .lte("joborder_date", endDate)
    .order("joborder_date", { ascending: false })
    .limit(500);
  if (error) throw new Error("작업 내역 조회 실패: " + error.message);
  return (data || []) as { joborder_date: string; product_name: string; spec: string; original_weight: number; used_weight: number; process_rule: string | null }[];
}

async function buildWorkPdf(supabase: any, companyName: string, dateLabel: string, rows: { joborder_date: string; product_name: string; spec: string; original_weight: number; used_weight: number; process_rule: string | null }[]): Promise<Uint8Array> {
  const { jsPDF } = await import("npm:jspdf@2.5.2");
  const [krFont, logoB64] = await Promise.all([getKrFontB64(supabase), getLogoB64(supabase)]);
  const doc = new jsPDF();
  doc.addFileToVFS("ohsung-kr.ttf", krFont);
  doc.addFont("ohsung-kr.ttf", "OhsungKR", "normal");

  const pageW = 210, marginX = 15, right = 210 - marginX;

  const drawHeader = () => {
    doc.addImage("data:image/jpeg;base64," + logoB64, "JPEG", marginX, 13, 30, 9.83);
    doc.setFont("OhsungKR", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY_SUB);
    doc.text("SMART ERP 2.0", marginX + 34, 20);

    doc.setFontSize(8); doc.setTextColor(...GRAY_SUB);
    doc.text("발행일시", right, 16, { align: "right" });
    doc.setFontSize(9.5); doc.setTextColor(...NAVY);
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    doc.text(now, right, 21, { align: "right" });

    doc.setDrawColor(...NAVY); doc.setLineWidth(0.9);
    doc.line(marginX, 26, right, 26);
  };

  drawHeader();

  doc.setFont("OhsungKR", "normal"); doc.setFontSize(22); doc.setTextColor(...DARK);
  doc.text("작 업 내 역 리 스 트", pageW / 2, 39, { align: "center" });

  const badgeW = 46, badgeH = 7, badgeX = pageW / 2 - badgeW / 2, badgeY = 44;
  doc.setFillColor(...BADGE_BG);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3.5, 3.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...BADGE_TX);
  doc.text("WORK ORDER LIST", pageW / 2, badgeY + 4.8, { align: "center" });

  const metaY = 56;
  doc.setFillColor(...META_BG);
  doc.roundedRect(marginX, metaY, right - marginX, 10, 2, 2, "F");
  doc.setFont("OhsungKR", "normal"); doc.setFontSize(9.5); doc.setTextColor(...META_TX);
  doc.text(`거래처: ${companyName}`, marginX + 5, metaY + 6.5);
  doc.text(`기간: ${dateLabel}`, pageW / 2, metaY + 6.5, { align: "center" });
  doc.text(`건수: ${rows.length}건`, right - 5, metaY + 6.5, { align: "right" });

  let y = metaY + 18;
  const colX = { date: marginX + 3, name: marginX + 32, spec: marginX + 66, orig: marginX + 108, used: marginX + 138, size: right - 3 };

  const drawTableHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(marginX, y, right - marginX, 8, "F");
    doc.setFont("OhsungKR", "normal"); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
    doc.text("작업일자", colX.date, y + 5.5);
    doc.text("품명", colX.name, y + 5.5);
    doc.text("규격", colX.spec, y + 5.5);
    doc.text("원중량", colX.orig, y + 5.5, { align: "right" });
    doc.text("중량", colX.used, y + 5.5, { align: "right" });
    doc.text("작업SIZE", colX.size, y + 5.5, { align: "right" });
    y += 8;
  };

  drawTableHeader();

  let totalOriginal = 0, totalUsed = 0;
  doc.setFontSize(9);
  if (rows.length === 0) {
    doc.setFont("OhsungKR", "normal"); doc.setTextColor(...GRAY_SUB);
    doc.text("작업 내역이 없습니다", pageW / 2, y + 6, { align: "center" });
    y += 9;
  }
  rows.forEach((r, i) => {
    const rowH = 7;
    if (y + rowH > 275) {
      doc.addPage();
      y = 20;
      drawHeader();
      y = 32;
      drawTableHeader();
    }
    if (i % 2 === 1) { doc.setFillColor(...ALT_ROW); doc.rect(marginX, y, right - marginX, rowH, "F"); }
    doc.setFont("OhsungKR", "normal"); doc.setTextColor(...DARK);
    doc.text(String(r.joborder_date ?? ""), colX.date, y + 5);
    doc.text(String(r.product_name ?? ""), colX.name, y + 5);
    doc.text(String(r.spec ?? ""), colX.spec, y + 5);
    doc.text(Number(r.original_weight || 0).toLocaleString(), colX.orig, y + 5, { align: "right" });
    doc.text(Number(r.used_weight || 0).toLocaleString(), colX.used, y + 5, { align: "right" });
    doc.text(String(r.process_rule ?? "") || "-", colX.size, y + 5, { align: "right" });
    totalOriginal += Number(r.original_weight) || 0;
    totalUsed += Number(r.used_weight) || 0;
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.15);
    doc.line(marginX, y + rowH, right, y + rowH);
    y += rowH;
  });

  y += 2;
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.6);
  doc.line(marginX, y, right, y);
  y += 7;
  doc.setFont("OhsungKR", "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
  doc.text("원중량 합계", colX.used - 28, y, { align: "right" });
  doc.text(`${totalOriginal.toLocaleString()} kg`, colX.used, y, { align: "right" });
  doc.text(`중량 합계 ${totalUsed.toLocaleString()} kg`, right, y, { align: "right" });

  y += 14;
  doc.setFont("OhsungKR", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY_SUB);
  doc.text("본 리스트는 오성철강 스마트 이알피에서 자동 생성되었습니다.", marginX, y);
  y += 5;
  doc.text("내용에 이상이 있으신 경우 오성철강사로 연락 주시기 바랍니다.", marginX, y);

  y += 18;
  doc.setFont("OhsungKR", "normal"); doc.setFontSize(13); doc.setTextColor(...DARK);
  doc.text("오 성 철 강 사", right, y, { align: "right" });

  return new Uint8Array(doc.output("arraybuffer"));
}

async function uploadPdf(jar: Map<string, string>, csrfToken: string, pdfBytes: Uint8Array, filename: string): Promise<number> {
  const form = new FormData();
  form.append("convertFile", new Blob([pdfBytes], { type: "application/pdf" }), filename);
  const res = await fetch(`${ENFAX_BASE}/fax/send/convert/0`, {
    method: "POST",
    headers: { "Cookie": cookieHeader(jar), "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest", "User-Agent": UA },
    body: form,
  });
  const json = await res.json();
  if (String(json.resCd) !== "200") throw new Error("업로드 실패: " + JSON.stringify(json));
  return json.resObj as number;
}

async function pollConvert(jar: Map<string, string>, csrfToken: string, fileNo: number, maxTries = 15): Promise<{ convertFilePath: string; pages: number }> {
  for (let i = 0; i < maxTries; i++) {
    const res = await fetch(`${ENFAX_BASE}/fax/send/convert/result/${fileNo}`, {
      method: "POST",
      headers: { "Cookie": cookieHeader(jar), "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest", "User-Agent": UA },
    });
    const json = await res.json();
    if (String(json.resCd) === "200" && json.resObj && json.resObj.convertStatus === "COMPLETE") {
      return { convertFilePath: json.resObj.convertFilePath, pages: json.resObj.pages };
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error("파일 변환 폴링 타임아웃");
}

async function getSenderPhone(jar: Map<string, string>, csrfToken: string): Promise<string> {
  const res = await fetch(`${ENFAX_BASE}/fax/send/send-caller`, {
    headers: { "Cookie": cookieHeader(jar), "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest", "User-Agent": UA },
  });
  const json = await res.json();
  const list = json.resObj || [];
  const main = list.find((c: any) => c.isMain === "Y") || list[0];
  if (!main) throw new Error("발신번호(caller) 조회 실패");
  return main.callerPhone;
}

async function sendFax(jar: Map<string, string>, csrfToken: string, senderPhone: string, convertFilePath: string, pages: number, targets: { fax: string; name: string }[]) {
  const payload = {
    masterDto: {
      device: "FAX", sendFunc: "DEFAULT", messageType: "SINGLE", sendType: "GENERAL",
      title: "", totalCnt: targets.length, sendPhone: senderPhone, sendDt: null,
      channel: "W", isDuplicate: "N", sendFaxTargetDtoList: [], sendTargetAddrDtoList: [],
      fileType: "MAIN", pagesPerTarget: pages,
      convertLists: [{ convertFilePath, pages, sortNo: 1 }],
    },
    sendReceiverDto: {
      addrFolderDtoList: [], addrGroupDtoList: [],
      addrMemberDtoList: targets.map((t) => ({ fax: t.fax, sendName: t.name, vars: null })),
    },
    faxSendCoverRequestDto: {},
  };
  const body = JSON.stringify(payload);
  const jsonHeaders = { "Cookie": cookieHeader(jar), "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/json", "Accept": "application/json", "User-Agent": UA };

  const estRes = await fetch(`${ENFAX_BASE}/fax/send/estimate/amount`, { method: "POST", headers: jsonHeaders, body });
  const estJson = await estRes.json().catch(() => null);

  const sendRes = await fetch(`${ENFAX_BASE}/fax/send/request`, { method: "POST", headers: jsonHeaders, body });
  const sendJson = await sendRes.json();
  if (String(sendJson.resCd) !== "200") throw new Error("발송 실패: " + JSON.stringify(sendJson));
  return { estimate: estJson, send: sendJson.resObj };
}

function jsonRes(obj: any, status = 200) {
  return new Response(JSON.stringify(obj, null, 1), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

// 회사명의 등록 활성 팩스번호를 조회하거나, adhoc 번호가 있으면 그것만 사용
async function resolveTargets(supabase: any, companyName: string, adhocFax: string | null, adhocName: string | null) {
  if (adhocFax) {
    return [{ fax: adhocFax.replace(/[^0-9]/g, ""), name: (adhocName || companyName).replace(/^\(주\)/, "") }];
  }
  const { data: faxRows, error: faxErr } = await supabase.from("customer_fax_numbers").select("fax_number").eq("company_name", companyName).eq("active", true);
  if (faxErr) throw new Error("팩스번호 조회 실패: " + faxErr.message);
  return (faxRows || []).map((f: any) => ({ fax: String(f.fax_number).replace(/[^0-9]/g, ""), name: companyName.replace(/^\(주\)/, "") }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const step = url.searchParams.get("step") || "send";
  const reportType = (url.searchParams.get("reportType") || "inbound") as "inbound" | "work";
  const dryRun = url.searchParams.get("dryRun") === "1";
  const targetDate = url.searchParams.get("date") || seoulDateStr();
  const startDate = url.searchParams.get("startDate") || targetDate;
  const endDate = url.searchParams.get("endDate") || targetDate;
  const companyName = url.searchParams.get("company") || "(주)대한강재";
  const fileNoParam = url.searchParams.get("fileNo") || "";
  const adhocFax = url.searchParams.get("fax");
  const adhocName = url.searchParams.get("faxName");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const dateLabel = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;
  const out: Record<string, any> = { step, reportType, startDate, endDate, companyName, dryRun };

  try {
    const { jar, csrfToken, reused } = await enfaxLogin(supabase);
    out.loginOk = true; out.sessionReused = reused;

    if (step === "poll") {
      const res = await fetch(`${ENFAX_BASE}/fax/send/convert/result/${fileNoParam}`, { method: "POST", headers: { "Cookie": cookieHeader(jar), "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest", "Accept": "application/json", "User-Agent": UA } });
      const text = await res.text();
      out.pollStatus = res.status;
      try { out.pollRaw = JSON.parse(text); } catch (_e) { out.pollRaw = text.slice(0, 1500); }
      out.ok = true;
      return jsonRes(out);
    }

    if (step === "pdf") {
      if (reportType === "work") {
        const rows = await fetchWorkRows(supabase, companyName, startDate, endDate);
        const pdfBytes = await buildWorkPdf(supabase, companyName, dateLabel, rows);
        return new Response(pdfBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="work_${startDate}.pdf"`, ...CORS_HEADERS } });
      }
      const { data: rows } = await supabase.from("greenp_inbound").select("inbound_date,product_name,spec,length_m,weight").eq("company_name", companyName).gte("inbound_date", startDate).lte("inbound_date", endDate).order("id");
      const pdfBytes = await buildInboundPdf(supabase, companyName, dateLabel, (rows || []) as any);
      return new Response(pdfBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="inbound_${startDate}.pdf"`, ...CORS_HEADERS } });
    }

    if (step === "send") {
      const targets = await resolveTargets(supabase, companyName, adhocFax, adhocName);
      out.targets = targets;
      if (targets.length === 0) { out.ok = false; out.error = "등록된 활성 팩스번호가 없습니다"; return jsonRes(out, 400); }

      let pdfBytes: Uint8Array;
      let filePrefix: string;
      if (reportType === "work") {
        const rows = await fetchWorkRows(supabase, companyName, startDate, endDate);
        out.rowCount = rows.length;
        pdfBytes = await buildWorkPdf(supabase, companyName, dateLabel, rows);
        filePrefix = "work";
      } else {
        const { data: rows, error: rowsErr } = await supabase.from("greenp_inbound").select("inbound_date,product_name,spec,length_m,weight").eq("company_name", companyName).gte("inbound_date", startDate).lte("inbound_date", endDate).order("id");
        if (rowsErr) throw new Error("입고 데이터 조회 실패: " + rowsErr.message);
        out.rowCount = (rows || []).length;
        pdfBytes = await buildInboundPdf(supabase, companyName, dateLabel, (rows || []) as any);
        filePrefix = "inbound";
      }
      out.pdfBytes = pdfBytes.length;

      const fileNo = await uploadPdf(jar, csrfToken, pdfBytes, `${filePrefix}_${startDate}.pdf`);
      out.fileNo = fileNo;

      const converted = await pollConvert(jar, csrfToken, fileNo);
      out.converted = converted;

      const senderPhone = await getSenderPhone(jar, csrfToken);
      out.senderPhone = senderPhone;

      if (dryRun) {
        out.ok = true; out.dryRunNote = "실제 발송(estimate/request)은 건너뜀";
        return jsonRes(out);
      }

      const result = await sendFax(jar, csrfToken, senderPhone, converted.convertFilePath, converted.pages, targets);
      out.result = result;
      out.ok = true;
      return jsonRes(out);
    }

    out.ok = false; out.error = "unknown step";
    return jsonRes(out, 400);
  } catch (err) {
    out.ok = false;
    out.error = String((err as Error)?.message || err);
    return jsonRes(out, 500);
  }
});
