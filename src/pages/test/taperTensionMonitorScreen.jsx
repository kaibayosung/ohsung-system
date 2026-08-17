// src/pages/test/taperTensionMonitorScreen.jsx
// 레벨링 라인 PR-DTC-3100 테이퍼 텐션 컨트롤러 원격 모니터링 — 컨트롤러가 디지털 통신 포트가
// 없어 LCD 화면을 카메라+OCR로 읽어 값을 뽑아내는 별도 시스템(사무실 PC에서 상시 실행)과 짝을
// 이루는 화면입니다. 레벨러 운영자가 외국인 근로자라 직접 조작이 어려워, 관리자가 폰으로 원격
// 상태를 확인하고 이상 시 바로 조치할 수 있도록 만든 모바일 관리자 화면입니다.
//
// 아직 카메라 거치·실측 테스트 전 단계라(현장 거치대 설치 예정) 아래 값은 샘플 데이터입니다.
// 실제 연동 후에는 사무실 PC의 OCR 모니터링 프로그램이 DB에 쌓는 값을 그대로 보여주게 됩니다.
import React from 'react';
import { COLORS } from './theme';

function ProposalBanner({ text }) {
  return (
    <div style={{
      background: COLORS.accentSoft, border: `1px solid ${COLORS.accentBg}`, borderRadius: '14px',
      padding: '14px 20px', fontSize: '14px', color: COLORS.accentDark, lineHeight: 1.6,
      display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '22px',
    }}>
      <span style={{ fontSize: '16px' }}>💡</span>
      <span>{text}</span>
    </div>
  );
}

const FIELDS = [
  { key: 'thickness', label: '두께 (um)', value: '1503' },
  { key: 'start_dia', label: '시작경 (mm)', value: '1205' },
  { key: 'tension_rate', label: '장력율', value: '1.5' },
  { key: 'tension_set', label: '장력설정', value: '45.1', accent: true },
];

const RECENT_ROWS = [
  { t: '17:47', pct: '45.1%', note: '두께 1503' },
  { t: '17:46', pct: '45.1%', note: '두께 1503' },
  { t: '17:45', pct: '44.8%', note: '두께 1503' },
];

export function TaperTensionMonitorScreen() {
  return (
    <div>
      <ProposalBanner text="레벨러 운영자가 외국인 근로자라 컨트롤러를 직접 조작하기 어려워, 관리자가 폰으로 원격 확인·조치할 수 있게 만든 화면입니다. 현재는 카메라 거치 전 단계라 샘플 데이터로 보여줍니다." />

      <div style={{ background: COLORS.bg, borderRadius: '24px', padding: '16px', maxWidth: '380px', margin: '0 auto' }}>
        <div style={{
          background: COLORS.white, borderRadius: '18px', border: `1px solid ${COLORS.border}`,
          padding: '18px', boxShadow: COLORS.shadowSm,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: COLORS.navy }}>오성철강 레벨링 관리</span>
            <span style={{ fontSize: '18px' }}>☰</span>
          </div>
          <p style={{ fontSize: '12px', color: COLORS.steelLight, margin: '0 0 14px' }}>PR-DTC-3100 실시간 모니터링</p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: COLORS.greenBg,
            borderRadius: '11px', padding: '10px 12px', marginBottom: '14px',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.green, flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: COLORS.green, fontWeight: 800 }}>연결됨 · 수집 중</span>
            <span style={{ fontSize: '12px', color: COLORS.steelLight, marginLeft: 'auto' }}>17:47 갱신</span>
          </div>

          <div style={{ background: COLORS.bg, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: COLORS.steelLight, margin: '0 0 6px' }}>출력 % (메인 값)</p>
            <p style={{ fontSize: '42px', fontWeight: 900, margin: 0, lineHeight: 1, color: COLORS.navy }}>45.1%</p>
            <p style={{ fontSize: '12px', color: COLORS.steelLight, margin: '6px 0 0' }}>신뢰도 92 · 5장 중 4장 동의</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '14px' }}>
            {FIELDS.map((f) => (
              <div key={f.key} style={{ background: COLORS.bg, borderRadius: '11px', padding: '10px 12px' }}>
                <p style={{ fontSize: '11px', color: COLORS.steelLight, margin: '0 0 4px' }}>{f.label}</p>
                <p style={{
                  fontSize: '19px', fontWeight: 800, margin: 0,
                  color: f.accent ? '#7a3fc7' : COLORS.navy,
                }}>{f.value}</p>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px', background: COLORS.amberBg,
            borderRadius: '11px', padding: '12px', marginBottom: '14px',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 800, color: COLORS.amber, margin: '0 0 2px' }}>주의 · 3회 연속 인식 실패</p>
              <p style={{ fontSize: '12px', color: COLORS.steel, margin: 0 }}>두께 항목이 3분째 값을 못 읽음. 조명·초점 확인 필요.</p>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: COLORS.steelLight, margin: '0 0 8px' }}>최근 기록</p>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '14px' }}>
            {RECENT_ROWS.map((r, i) => (
              <div
                key={r.t}
                style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px',
                  borderBottom: i < RECENT_ROWS.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                }}
              >
                <span style={{ color: COLORS.steelLight }}>{r.t}</span>
                <span style={{ color: COLORS.navy, fontWeight: 700 }}>{r.pct}</span>
                <span style={{ color: COLORS.steelLight }}>{r.note}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            <button
              style={{
                padding: '11px', borderRadius: '10px', border: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.white, color: COLORS.steel, fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              재연결 확인
            </button>
            <button
              style={{
                padding: '11px', borderRadius: '10px', border: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.white, color: COLORS.steel, fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              알림 설정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
