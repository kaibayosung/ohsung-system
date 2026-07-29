// src/pages/test/incidentAnalysisScreen.jsx
// 장애 원인 분석 (AI) — "제조AX_발표자료" 104p 이후 실제 사례(2026-06-25 슬리터 라인
// 스트립 이탈 사고)를 그대로 재구성한 샘플 화면입니다.
//
// 실제로 있었던 일: PLC CSV(사고일 523행 + 정상일 14,116행) + CCTV 캡처만 올리고
// 한국어로 11번 질문했더니, Claude가 30분 만에 원인 규명·보고서·인포그래픽·교육만화까지
// 만들어냈습니다. 이 화면은 그 결과물을 ERP 안에서 볼 수 있다면 어떤 모습일지 미리 보여주는
// 정적 샘플이며, 실제 PLC/CCTV 연동은 아직 되어 있지 않습니다.
import React, { useState } from 'react';
import { COLORS, box, pill } from './theme';

function ProposalBanner({ text }) {
  return (
    <div style={{
      background: COLORS.accentSoft, border: `1px solid ${COLORS.accentBg}`, borderRadius: '14px',
      padding: '14px 20px', fontSize: '14px', color: COLORS.accentDark, lineHeight: 1.6,
      display: 'flex', gap: '10px', alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '16px' }}>💡</span>
      <span>{text}</span>
    </div>
  );
}

const TIMELINE = [
  { t: '10:56:45', title: '리코일러 맨드렐 확장 작업 시작', desc: '작업자 2가 리코일러 외경 확대 버튼 조작', tone: 'normal' },
  { t: '10:56:57', title: '언코일러 단독 구동', desc: 'PLC가 언코일러에 +23A 구동 신호 전달 — 3롤 정지 상태에서 인터록 미작동', tone: 'warn' },
  { t: '10:56:59', title: '언코일러 -143 RPM 과속', desc: '루프 피트 NO1 급상승 74% → 130%', tone: 'warn' },
  { t: '10:58:23', title: '슬리터 오기동', desc: '주 조작자 상황 오판 → 이미 130%인 상태에서 슬리터 21 RPM 기동', tone: 'danger' },
  { t: '10:58:55', title: '스트립 완전 이탈', desc: '루프 NO1 = 0% · 라인 전체 비상 정지 · 설비 손상', tone: 'danger' },
];

const COMPARE_ROWS = [
  ['LINE SPEED (m/min)', '181.9', '0.0'],
  ['TENSION 평균', '146 ~ 155', '0'],
  ['3ROLL SPEED', '가동 중', '완전 정지'],
  ['NO1 LOOP 최대', '75 ~ 100%', '130%+'],
  ['UNCOILER 전류', '소전류 (회생)', '+23A 구동'],
];

const LOOP_TREND = [
  { t: '10:55:00', v: 75 },
  { t: '10:56:45', v: 74 },
  { t: '10:57:00', v: 113 },
  { t: '10:57:30', v: 130 },
  { t: '10:58:23', v: 128 },
  { t: '10:58:55', v: 0 },
];

const QUESTIONS = [
  { n: 1, q: '언코일러 -143 RPM 경우 상관관계 찾아줘. 조절 가능한 건 텐션 1~4와 스피드뿐이야', a: 'LINE SPEED=0인데 -143 RPM 발생 → 물리적으로 이상 (루프 피트가 완충 역할)' },
  { n: 2, q: '슬리터의 속도 value가 뭐로 추정돼? LINE_SPEED_VALUE가 슬리터 속도가 맞나?', a: 'LINE_SPEED는 스트립 이동속도, SLITTER_SPEED와는 감속비 7.99배 관계 (상관계수 0.9994)' },
  { n: 3, q: 'LINE_SPEED_VALUE도 같이 봐줘. 운전속도와 -143 RPM 발생 상관관계 있어?', a: '속도가 높을수록 TENSION 정비례 상승 — 사고 당일 TENSION=0은 라인 정지 상태를 재확인' },
  { n: 4, q: '그런데 LINE SPEED가 0일 때 -143이라는 게 말이 안 되는데?', a: '+23A는 능동 구동의 증거 — 코일 관성이라면 전류가 낮아야 함' },
  { n: 5, q: '루프 피트가 넘치겠네? 시간순으로 보여줘', a: '4분 만에 정상(75%) → 위험(130%) → 이탈(0%)로 붕괴' },
  { n: 6, q: '자 그럼 원인이 뭐라고 생각해?', a: '직접원인·기여원인·근본원인 3단계로 자동 정리 (아래 원인분석 참고)' },
  { n: 7, q: '10시 56분에 리코일러 외경 확대 작업을 했다고 해', a: '현장 정보 추가 → 사고 시나리오가 분 단위로 완전히 확정됨' },
  { n: 8, q: '사진과 같이 보여줘', a: 'CCTV 8장 + PLC 데이터를 시각 기준으로 자동 매칭한 HTML 리포트 생성' },
  { n: 9, q: 'PDF로 만들어줘. 영어로도 하나 더 만들어줘', a: '한/영 분석 보고서 자동 생성 (기존 2~3일 → 15분, 번역 +1일 → +2분)' },
  { n: 10, q: '불량의 내용을 인포그래픽으로 보기 쉽게 그려줘', a: '흐름도·타임라인·상태 색상까지 반영한 SVG 인포그래픽 자동 생성' },
  { n: 11, q: '외국인 근로자 교육용으로 만화 형태로 작성해줘', a: '8컷 한/영 교육 만화 자동 생성 (외주 제작 대비 1~2주 → 30분)' },
];

const OUTPUTS = [
  { icon: '🖥️', name: '작업자_동작_데이터_분석.html', desc: 'CCTV 8장 + PLC 데이터 매칭 대화형 리포트' },
  { icon: '📄', name: '슬리터_이상분석_KO/EN.pdf', desc: '원인·타임라인·재발방지책 포함 종합 보고서 (한/영)' },
  { icon: '📊', name: '슬리터_사고분석_엔지니어질의.xlsx', desc: '설비 공급사 원인 질의용 데이터 시트' },
  { icon: '🖼️', name: '슬리터_사고_인포그래픽.html', desc: '기계 흐름 + 사고 타임라인 인포그래픽' },
  { icon: '📚', name: '슬리터_사고_만화_교육.html', desc: '외국인 근로자용 8컷 한/영 교육 만화' },
];

const ROI_ROWS = [
  ['PLC 데이터 검토', '4~8시간', '3~5분'],
  ['상관관계 분석', '4~8시간', '5분'],
  ['원인 분석 보고서', '2~3일', '15분'],
  ['영문 번역 보고서', '+1일', '+2분'],
  ['CCTV+데이터 매칭', '4시간', '10분'],
  ['인포그래픽 제작', '1~2주', '5분'],
  ['교육 만화 제작', '1~2주', '5분'],
  ['Excel 분석 보고서', '반나절', '5분'],
];

const TONE_STYLE = {
  normal: [COLORS.blue, COLORS.blueBg],
  warn: [COLORS.amber, COLORS.amberBg],
  danger: [COLORS.red, COLORS.redBg],
};

function StatCard({ label, value, sub }) {
  return (
    <div style={box.statCard}>
      <div style={box.statLabel}>{label}</div>
      <div style={box.statValue}>{value}</div>
      {sub && <div style={{ fontSize: '13px', color: COLORS.steelLight }}>{sub}</div>}
    </div>
  );
}

export function IncidentAnalysisSample() {
  const [openQ, setOpenQ] = useState(null);
  const maxLoop = 140;

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>
          장애 원인 분석 (AI)
          <span style={{ marginLeft: '10px', verticalAlign: 'middle' }}>
            <span style={pill(COLORS.accentBg, COLORS.accentDark)}>샘플 · 실제 사례 기반</span>
          </span>
        </h2>
        <p style={box.hint}>PLC 이력 데이터 + CCTV 캡처만 올리면, AI가 한국어 대화만으로 사고 원인을 규명하고 보고서·인포그래픽·교육자료까지 만들어냅니다.</p>
      </div>

      <ProposalBanner text="실제로 있었던 사례입니다. 2026-06-25 슬리터 라인 스트립 이탈 사고를 PLC CSV(사고일 523행 + 정상일 14,116행)만으로 30분 만에 분석한 결과를 그대로 재구성했습니다. 정식 서비스가 되면 PLC·CCTV 데이터가 이 화면에 자동으로 연결됩니다. 아래 내용은 그 결과를 미리 보여주는 샘플입니다." />

      <div style={box.statGrid}>
        <StatCard label="총 분석 소요 시간" value="30분" sub="기존 방식 대비 약 7~14일 → 30분" />
        <StatCard label="사용한 분석 질문" value="11가지" sub="모두 한국어 자연어 질문" />
        <StatCard label="자동 생성 결과물" value="8종" sub="보고서·인포그래픽·교육만화 등" />
        <StatCard label="업무 시간 단축" value="약 95%" sub="추가 도구 비용 0원 · 코딩 불필요" />
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>사고 개요 — 2분 10초 만에 벌어진 일 (2026-06-25, 슬리터2 라인)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {TIMELINE.map((ev, i) => {
            const [color, bg] = TONE_STYLE[ev.tone];
            return (
              <div key={ev.t} style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '84px', flexShrink: 0 }}>
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%', backgroundColor: color,
                    marginTop: '4px', flexShrink: 0, boxShadow: `0 0 0 4px ${bg}`,
                  }} />
                  {i < TIMELINE.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: COLORS.border, marginTop: '2px' }} />}
                </div>
                <div style={{ paddingBottom: i < TIMELINE.length - 1 ? '22px' : '2px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{ev.t}</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: COLORS.navy }}>{ev.title}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: COLORS.steel, lineHeight: 1.5 }}>{ev.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        <div style={box.card}>
          <h3 style={box.subtitle}>정상 운전 vs 사고 당일</h3>
          <table style={box.table}>
            <thead>
              <tr>
                <th style={box.th}>항목</th>
                <th style={box.th}>정상 운전</th>
                <th style={{ ...box.th, backgroundColor: COLORS.red }}>사고 당일</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r) => (
                <tr key={r[0]}>
                  <td style={{ ...box.td, fontWeight: 700, color: COLORS.navy }}>{r[0]}</td>
                  <td style={box.td}>{r[1]}</td>
                  <td style={{ ...box.td, color: COLORS.red, fontWeight: 800 }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={box.card}>
          <h3 style={box.subtitle}>루프 피트 NO1 수위 변화</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '180px', paddingTop: '10px' }}>
            {LOOP_TREND.map((p) => {
              const isDanger = p.v >= 130;
              const isZero = p.v === 0;
              const h = Math.max((p.v / maxLoop) * 100, 3);
              return (
                <div key={p.t} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: isDanger ? COLORS.red : isZero ? COLORS.steelLight : COLORS.navy }}>{p.v}%</div>
                  <div style={{
                    width: '100%', height: `${h}%`, borderRadius: '6px 6px 0 0',
                    backgroundColor: isDanger ? COLORS.red : isZero ? COLORS.border : COLORS.blue,
                  }} />
                  <div style={{ fontSize: '11px', color: COLORS.steelLight, fontVariantNumeric: 'tabular-nums' }}>{p.t.slice(0, 5)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '13px', color: COLORS.steelLight, marginTop: '10px' }}>정상 범위 75~100% / 130%는 물리적 한계 초과 — 4분 만에 정상 → 위험 → 이탈</div>
        </div>
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>원인 분석 (AI가 3단계로 자동 정리)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ borderLeft: `4px solid ${COLORS.blue}`, paddingLeft: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.blue, marginBottom: '6px' }}>직접 원인</div>
            <div style={{ fontSize: '14px', color: COLORS.navy, lineHeight: 1.6 }}>리코일러 맨드렐 확장 버튼 조작 → PLC가 언코일러에 +23A 구동 신호 전달</div>
          </div>
          <div style={{ borderLeft: `4px solid ${COLORS.amber}`, paddingLeft: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.amber, marginBottom: '6px' }}>기여 원인</div>
            <div style={{ fontSize: '14px', color: COLORS.navy, lineHeight: 1.6 }}>3롤 정지 상태에서 언코일러 단독 구동을 막는 인터록 부재 — 루프 피트가 버퍼 역할을 해 LINE SPEED=0에서도 단독 회전 가능</div>
          </div>
          <div style={{ borderLeft: `4px solid ${COLORS.red}`, paddingLeft: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.red, marginBottom: '6px' }}>근본 원인</div>
            <div style={{ fontSize: '14px', color: COLORS.navy, lineHeight: 1.6 }}>리코일러 단독 작업 시 인터록 설계 결함 + 작업자 간 소통 절차 미비 — 주 조작자 사전 통보 없이 리코일러 작업 실시</div>
          </div>
        </div>
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>실제 사용한 질문 11가지</h3>
        <p style={{ fontSize: '14px', color: COLORS.steel, marginBottom: '14px' }}>모두 한국어 자연어 질문입니다. 클릭하면 AI가 찾아낸 답을 볼 수 있습니다.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {QUESTIONS.map((item) => {
            const isOpen = openQ === item.n;
            return (
              <div key={item.n} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenQ(isOpen ? null : item.n)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '13px 16px', background: isOpen ? COLORS.accentSoft : COLORS.white,
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'inherit',
                  }}
                >
                  <span style={{
                    width: '26px', height: '26px', borderRadius: '50%', backgroundColor: COLORS.navy, color: '#fff',
                    fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{item.n}</span>
                  <span style={{ fontSize: '15px', color: COLORS.navy, fontWeight: 700, flex: 1 }}>"{item.q}"</span>
                  <span style={{ color: COLORS.steelLight, fontSize: '14px' }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 16px 16px 54px', fontSize: '14px', color: COLORS.steel, lineHeight: 1.6 }}>
                    → {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>자동 생성된 결과물</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {OUTPUTS.map((o) => (
            <div key={o.name} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px 16px', border: `1px solid ${COLORS.border}`, borderRadius: '12px' }}>
              <span style={{ fontSize: '22px' }}>{o.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.navy, marginBottom: '4px', wordBreak: 'break-all' }}>{o.name}</div>
                <div style={{ fontSize: '13px', color: COLORS.steel, lineHeight: 1.5 }}>{o.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>기존 방식 vs AI — 소요 시간 비교</h3>
        <table style={box.table}>
          <thead>
            <tr>
              <th style={box.th}>업무 항목</th>
              <th style={box.th}>기존 방식</th>
              <th style={{ ...box.th, backgroundColor: COLORS.accent }}>AI 분석</th>
            </tr>
          </thead>
          <tbody>
            {ROI_ROWS.map((r) => (
              <tr key={r[0]}>
                <td style={{ ...box.td, fontWeight: 700, color: COLORS.navy }}>{r[0]}</td>
                <td style={box.td}>{r[1]}</td>
                <td style={{ ...box.td, color: COLORS.accentDark, fontWeight: 800 }}>{r[2]}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...box.td, fontWeight: 800, color: COLORS.navy, borderBottom: 'none' }}>합계</td>
              <td style={{ ...box.td, fontWeight: 800, borderBottom: 'none' }}>7~14일</td>
              <td style={{ ...box.td, color: COLORS.accentDark, fontWeight: 900, borderBottom: 'none' }}>약 30분</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '13px', color: COLORS.steelLight, lineHeight: 1.6, padding: '4px 4px 0' }}>
        ※ 이 화면은 샘플입니다. 실제 서비스로 만들려면 PLC 데이터 통합저장 시스템·CCTV 저장소와 연동해 사고 시간대 데이터를 자동으로 모으고, 이 화면의 질문-답변 흐름을 실제 AI 호출로 대체하면 됩니다.
      </div>
    </div>
  );
}
