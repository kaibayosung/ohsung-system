// src/lib/separatorCalc.js
// 세퍼레이터 셋팅 계산 엔진 — 연구실 관리자 화면(pages/test/separatorSetup.jsx)과
// 현장 태블릿 키오스크(separator/SeparatorKiosk.jsx)가 함께 사용하는 단일 로직입니다.
// 두 화면이 각자 계산식을 따로 들고 있으면 나중에 값이 조금씩 어긋날 위험이 있어 여기 하나로 모았습니다.
//
// 근거: "세퍼레이저 셋팅 가이드 프로그램.pdf" 손글씨 메모.
//   목표폭 = 가닥폭 + 보정값 (세퍼레이터① = +1, ②·③ = -25, ②·③은 항상 동일 조합)
//   목표폭을 보유 규격 중 큰 것부터 채워나가는 방식으로 분해 (예: 30+30+10+5=75)
// ⚠️ 원본 메모의 규격표에는 100·90·10~1만 적혀 있었지만, 손글씨 계산 예시를 그대로
// 재현하려면 30mm 같은 중간 규격이 실제로 있어야 맞습니다. 그래서 10~100mm 십단위 전체를
// 기본값으로 채워 넣었습니다 — 실제 보유 재고와 다르면 연구실 화면의 설정에서 고쳐야 합니다.
export const DEFAULT_DENOMS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const DEFAULT_COUNTS = Object.fromEntries(DEFAULT_DENOMS.map((d) => [d, 50]));
export const DEFAULT_STATIONS = [
  { key: 1, label: '세퍼레이터①', offset: 1 },
  { key: 2, label: '세퍼레이터②', offset: -25 },
  { key: 3, label: '세퍼레이터③', offset: -25 },
];
export const DEFAULT_PLASTIC_THRESHOLD = 10; // 이 값 미만 = 플라스틱(파랑), 이상 = 금속(회색)

// 가공규격 문자열("138=6,132=2,122=1")을 [{width, qty}] 로 파싱
export function parseProcessRule(rule) {
  if (!rule) return [];
  return rule.split(',').map((tok) => {
    const [w, q] = tok.split('=');
    const width = parseFloat(w);
    const qty = parseInt(q, 10);
    if (!Number.isFinite(width) || !Number.isFinite(qty)) return null;
    return { width, qty };
  }).filter(Boolean);
}

// 가장 큰 규격부터 채우는 방식 (손글씨 메모의 30+30+10+5 예시와 동일한 방식)
export function decompose(target, denomsDesc) {
  let remaining = Math.round(target);
  const pieces = [];
  if (remaining <= 0) return { pieces, remainder: remaining };
  for (const d of denomsDesc) {
    while (remaining >= d) {
      pieces.push(d);
      remaining -= d;
    }
  }
  return { pieces, remainder: remaining };
}

export function groupPieces(pieces) {
  const map = new Map();
  pieces.forEach((p) => map.set(p, (map.get(p) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([size, count]) => ({ size, count }));
}

// strips: [{width, qty}], stations: [{key,label,offset}], denomsDesc: 내림차순 규격 배열
// -> stations.map 결과에 rows(각 strip별 target/pieces/remainder)를 채워서 반환
export function computeStationResults(strips, stations, denomsDesc) {
  return stations.map((st) => {
    const rows = strips.map((s) => {
      const target = s.width + st.offset;
      const { pieces, remainder } = decompose(target, denomsDesc);
      return { ...s, target, pieces: groupPieces(pieces), remainder };
    });
    return { ...st, rows };
  });
}
