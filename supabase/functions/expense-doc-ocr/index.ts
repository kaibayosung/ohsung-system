// expense-doc-ocr: 지출결의서 초안을 만들기 위해, 미지급금/결제건 표가 담긴 이미지를
// Claude Vision으로 읽어 구조화된 JSON(지급 항목 배열)으로 추출합니다.
//
// enfax-ocr과 동일하게 ANTHROPIC_API_KEY Edge Function Secret을 사용합니다 (이미 설정되어 있음).
// 이 함수는 엔팩스 로그인 세션이 필요 없는 단순 버전 — 브라우저에서 파일을 base64로
// 직접 인코딩해 보내면 바로 Claude Vision에 넘겨 분석합니다.
//
// 호출: POST { imageBase64: string(순수 base64, data: 접두어 제외), mediaType: 'image/png'|'image/jpeg' }
// 응답: { ok, extracted: { request_date, items: [...] } } | { ok:false, error }

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACCOUNT_CATEGORIES = ['급여', '4대보험', '대출이자', '카드대금', '위탁대행/기타', '퇴직연금', '통신비', '수도광열비', '원자재매입', '설비 도입', '기타'];

async function callClaudeVision(base64: string, mediaType: string): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 시크릿이 설정되어 있지 않습니다.");

  const prompt = `이 이미지는 회사의 "미지급금(결제건)" 또는 지출/이체 목록 표입니다 (스캔본, 사진, 또는 엑셀 캡처일 수 있습니다).
표에 있는 각 행을 읽어서 아래 JSON 형식으로만 응답하세요 (설명, 코드블록, 다른 텍스트 없이 순수 JSON만):
{
  "request_date": "문서 상단에 적힌 날짜 YYYY-MM-DD 형식 (없으면 null)",
  "items": [
    {
      "vendor_name": "지급 대상/거래처/항목명 (표의 '지급', '적요', '내역' 등 컬럼)",
      "account_holder": "예금주 (계좌 명의인)",
      "bank_name": "은행명",
      "account_no": "계좌번호 (하이픈 표기 그대로)",
      "amount": "금액 (숫자만, 쉼표/원 표시 제거)",
      "account_category_guess": "다음 중 가장 가까운 것 하나를 골라 넣으세요: ${ACCOUNT_CATEGORIES.join(', ')} — 애매하면 '기타'"
    }
  ]
}
합계/소계 행은 items에 포함하지 마세요. 값을 확신할 수 없으면 해당 필드만 null로 두고, 다른 필드는 있는 대로 채워주세요. 표에 보이는 행 수만큼 items 배열에 전부 넣어주세요.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: prompt },
      ]}],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Claude API 오류 (${resp.status}): ${errText.slice(0, 500)}`);
  }
  const json = await resp.json();
  const text = json?.content?.[0]?.text || "";
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    throw new Error("Claude 응답 JSON 파싱 실패: " + text.slice(0, 300));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  try {
    const body = await req.json();
    const { imageBase64, mediaType } = body || {};
    if (!imageBase64) throw new Error("imageBase64가 필요합니다.");
    const extracted = await callClaudeVision(imageBase64, mediaType || "image/png");
    return new Response(JSON.stringify({ ok: true, extracted }), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String((err as Error)?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});
