// customer-chatbot-ask: 고객사 챗봇(연구실)의 자연어 응답 엔진.
// 프론트엔드가 해당 거래처 범위로 스코핑해 보낸 JSON만 근거로 Claude가 답합니다.
// 호출: POST { question, context } / 응답: { ok, answer, model } | { ok:false, error }
//
// [2026-10-20 비용 절감] 기본 모델 claude-sonnet-5 → claude-haiku-5-5 (입력 $0.10 / 출력 $0.50 per 1M, Sonnet의 약 1/20).
//  - Haiku 5.5는 adaptive thinking이 기본 ON이라 thinking을 끄고 effort=low로 둡니다 (추론 토큰도 출력 요금).
//  - 시스템 프롬프트(거래처 JSON)는 prompt cache로 표시 → 같은 거래처가 5분 안에 연달아 물으면 입력 요금 1/10.
//  - Haiku 호출이 실패하거나 텍스트가 비면 1회만 Sonnet 5로 재시도(예전 설정 그대로)해서 챗봇이 멈추지 않게 합니다.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRIMARY_MODEL = "claude-haiku-5-5";
const PRIMARY_MAX_TOKENS = 800; // thinking을 끄므로 답변(2~4문장)만 들어가면 충분
const FALLBACK_MODEL = "claude-sonnet-5";
// Sonnet은 추론(thinking) 블록을 먼저 내놓는 경우가 있어 토큰 예산이 작으면 text 블록 없이 끝남 → 여유 있게.
const FALLBACK_MAX_TOKENS = 3000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function buildSystemPrompt(context: any) {
  return `당신은 오성철강의 거래처 담당자를 위한 고객 상담 챗봇입니다.
아래 JSON은 "${context.company}"의 최근 ${context.windowDays}일 작업 현황 데이터입니다. 이 JSON 안에 있는 내용만 근거로 답변하세요.

${JSON.stringify(context)}

규칙:
- stats 필드에 이미 계산된 집계값(건수, 금액 합계 등)이 있으면 직접 계산하지 말고 그대로 사용하세요.
- 특정 코일번호/품명을 물어보면 orders 배열에서 product_name을 찾아 spec, 상태(stageLabel), 작업일 등을 알려주세요. 못 찾으면 "해당 코일 정보를 찾을 수 없습니다"라고 답하세요.
- 이 JSON 범위를 벗어난 질문(다른 거래처 정보, 오성철강 내부 재무/인사, 일반 상식, 개인적 의견 요청 등)에는 "죄송하지만 이 챗봇은 ${context.company}의 작업 현황 관련 질문만 답변드릴 수 있어요"라고 정중히 답하고 다른 내용은 지어내지 마세요.
- 데이터에 없는 숫자나 사실을 절대 추측해서 만들어내지 마세요.
- 친절하고 간결한 한국어로, 보통 2~4문장 이내로 답하세요. 여러 건을 나열할 때는 줄바꿈해서 보여줘도 됩니다.
- 마크다운 문법(별표로 굵게, # 제목, 목록 기호 등)은 쓰지 마세요. 채팅창에 그대로 표시되는 일반 텍스트입니다.
- 인사말이나 잡담에는 짧게 자연스럽게 응하되, 곧장 무엇을 도와줄 수 있는지 안내하세요.`;
}

// content 배열에는 text 외에 thinking 블록이 섞일 수 있고 순서도 고정이 아니라,
// content[0].text만 읽으면 멀쩡한 답변을 받고도 빈 값으로 오판합니다. text 블록만 모아 이어붙입니다.
function extractText(data: any): string {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b: any) => b && b.type === "text" && typeof b.text === "string")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

async function postMessages(apiKey: string, body: Record<string, unknown>): Promise<any> {
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
    throw new Error(`Claude API 오류 (${body.model}, ${resp.status}): ${errText.slice(0, 500)}`);
  }
  const data = await resp.json();
  // 크레딧 추적용: Edge Function 로그에 모델·토큰 사용량을 남깁니다.
  console.log("usage", JSON.stringify({ model: body.model, usage: data?.usage }));
  return data;
}

async function callClaude(question: string, context: any): Promise<{ text: string; model: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 시크릿이 설정되어 있지 않습니다.");

  const systemText = buildSystemPrompt(context);
  const messages = [{ role: "user", content: question }];

  // 1차: Haiku 5.5 (thinking off, effort low, 시스템 프롬프트 캐시)
  try {
    const data = await postMessages(apiKey, {
      model: PRIMARY_MODEL,
      max_tokens: PRIMARY_MAX_TOKENS,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
      messages,
    });
    const text = extractText(data);
    if (text) return { text, model: PRIMARY_MODEL };
    console.warn("Haiku 응답에 텍스트 없음 → Sonnet 재시도", { stop_reason: data?.stop_reason });
  } catch (e) {
    console.warn("Haiku 호출 실패 → Sonnet 재시도:", String((e as Error)?.message || e));
  }

  // 2차(예비): Sonnet 5, 예전 설정 그대로
  const data = await postMessages(apiKey, {
    model: FALLBACK_MODEL,
    max_tokens: FALLBACK_MAX_TOKENS,
    system: systemText,
    messages,
  });
  const text = extractText(data);
  if (!text) {
    const kinds = (Array.isArray(data?.content) ? data.content : []).map((b: any) => b?.type).join(",");
    console.error("text 블록 없음", { stop_reason: data?.stop_reason, kinds });
    throw new Error(`Claude 응답에 텍스트가 없습니다 (stop_reason=${data?.stop_reason ?? "?"}, blocks=[${kinds}])`);
  }
  return { text, model: FALLBACK_MODEL };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { question, context } = await req.json();
    if (!question || typeof question !== "string") {
      return json({ ok: false, error: "question이 필요합니다." }, 400);
    }
    if (!context) {
      return json({ ok: false, error: "context가 필요합니다." }, 400);
    }
    const { text, model } = await callClaude(question, context);
    return json({ ok: true, answer: text, model });
  } catch (err) {
    const msg = String((err as Error)?.message || err);
    console.error("customer-chatbot-ask 실패:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});
