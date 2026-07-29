// src/pages/InternalSystemsPage.jsx
// 오성철강 내부 시스템 바로가기 — 슬리팅 대시보드, 작업선택 PAD, 품질측정 등
// 사내 서버(osungsteel.servehttp.com)에 별도로 떠 있는 시스템과, 그린피웹/enFax 같은
// 외부 연동 시스템을 한 페이지에 모아 바로 접속할 수 있게 합니다.
// ERP 2.0과는 별도 서버/도메인이라 SMART ERP 2.0 안으로 통합하지 않고, 새 탭으로 열어줍니다.
import React from 'react';

const C = {
  surface1: '#F4F6FA', surface2: '#FFFFFF',
  border: '#E3E8F0', borderStrong: '#C9D2E0',
  textPrimary: '#0F1E33', textSecondary: '#4D5C72', textMuted: '#8592A6',
  accent: '#E8830F', accentBg: '#FDECD6', accentText: '#C46B06',
  green: '#1C7A4D', greenBg: '#E2F5EA',
  navyGradient: 'linear-gradient(160deg, #16283f 0%, #0a1524 100%)',
};

const ERP2_SERVICES = [
  {
    icon: '🖥️', name: '세퍼레이터 태블릿 키오스크 (슬리터2)', status: '운영중',
    url: '/separator',
    desc: '슬리터2 현장 태블릿에 배포된 세퍼레이터 셋팅 화면 — 오늘 작업만 표시, 가닥폭+보정=목표폭 계산식과 스페이서 조합을 큰 글씨로 보여줍니다.',
  },
];

const INTERNAL_SYSTEMS = [
  {
    icon: '📊', name: '슬리팅 대시보드', status: '운영중',
    url: 'http://osungsteel.servehttp.com:38080/',
    desc: 'ERP에 등록한 작업지시서를 대시보드 시스템에 등록',
  },
  {
    icon: '🖥️', name: '작업선택 PAD — 슬리팅1', status: '운영중',
    url: 'http://osungsteel.servehttp.com:38080/pad/sliting',
    desc: 'PLC 데이터와 ERP 데이터를 합치기 위한 작업 선택 (태블릿 화면)',
  },
  {
    icon: '🖥️', name: '작업선택 PAD — 슬리팅2', status: '운영중',
    url: 'http://osungsteel.servehttp.com:38080/pad/sliting2',
    desc: 'PLC 데이터와 ERP 데이터를 합치기 위한 작업 선택 (태블릿 화면)',
  },
  {
    icon: '🖥️', name: '작업선택 PAD — 레벨링', status: '운영중',
    url: 'http://osungsteel.servehttp.com:38080/pad/leveling',
    desc: 'PLC 데이터와 ERP 데이터를 합치기 위한 작업 선택 (태블릿 화면)',
  },
  {
    icon: '🔌', name: 'PLC 데이터 통합저장', status: '운영중',
    url: 'http://osungsteel.servehttp.com:38080/plc-data',
    desc: 'PLC 데이터와 코일 ID를 통합 저장',
  },
  {
    icon: '🔍', name: '품질 측정 시스템', status: '파일럿',
    url: 'http://osungsteel.servehttp.com:8095/admin/login',
    desc: '슬리팅 공정의 철판 표면 불량 확인용',
    note: '기본 계정 admin / admin',
  },
];

const EXTERNAL_SYSTEMS = [
  {
    icon: '🌐', name: '그린피웹 ERP', status: '외부',
    url: 'http://greenpweb.co.kr',
    desc: '기존 외부 ERP — RPA Agent가 자동으로 대사·동기화',
  },
  {
    icon: '📠', name: 'enFax', status: '외부',
    url: 'https://www.enfax.com',
    desc: 'FAX 발송 대행 서비스 — 고객 리포트 자동발송 연동',
  },
  {
    icon: '📡', name: '슬리팅2 장비 운용 상황 실시간 NMS', status: '운영중',
    url: 'https://platform.smic.kr:30390/dashboards/all/197a94c0-d635-11f0-bb15-87027a672b53',
    desc: '슬리팅2 라인 장비 운용 상태를 실시간으로 모니터링하는 외부 NMS 대시보드',
  },
];

function statusBadge(status) {
  const isLive = status === '운영중';
  return (
    <span
      style={{
        fontSize: '12px', fontWeight: 800, padding: '3px 10px', borderRadius: '999px',
        background: isLive ? C.greenBg : C.accentBg,
        color: isLive ? C.green : C.accentText,
      }}
    >
      {status}
    </span>
  );
}

function SystemCard({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: '14px',
        padding: '18px 20px', textDecoration: 'none', color: 'inherit',
        boxShadow: '0 1px 3px rgba(15,30,51,0.05)', transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = '0 6px 16px rgba(232,131,15,0.18)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,30,51,0.05)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>{item.icon}</span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: C.textPrimary }}>{item.name}</span>
        </div>
        {statusBadge(item.status)}
      </div>
      <div style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.5 }}>{item.desc}</div>
      <div style={{ fontSize: '13px', color: C.textMuted, wordBreak: 'break-all' }}>{item.url}</div>
      {item.note && (
        <div style={{ fontSize: '12.5px', color: C.accentText, background: C.accentBg, borderRadius: '8px', padding: '6px 10px', width: 'fit-content' }}>
          ⚠️ {item.note}
        </div>
      )}
      <div style={{ marginTop: '2px', fontSize: '13px', fontWeight: 700, color: C.accent }}>바로가기 → 새 탭에서 열기</div>
    </a>
  );
}

export default function InternalSystemsPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', background: C.navyGradient,
          borderRadius: '14px', padding: '18px 22px', marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(15,30,51,0.18)',
        }}
      >
        <span style={{ fontSize: '26px' }}>🔗</span>
        <div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginBottom: '2px' }}>오성철강 내부 시스템</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: '#fff' }}>대시보드 · PAD · 품질측정 등 사내 시스템 바로가기</div>
        </div>
      </div>

      <div style={{ fontSize: '15px', fontWeight: 800, color: C.textSecondary, margin: '4px 0 12px' }}>
        ERP 2.0 현장 배포 서비스
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        {ERP2_SERVICES.map((item) => <SystemCard key={item.url} item={item} />)}
      </div>

      <div style={{ fontSize: '15px', fontWeight: 800, color: C.textSecondary, margin: '4px 0 12px' }}>
        자체 개발 시스템 (사내 서버)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        {INTERNAL_SYSTEMS.map((item) => <SystemCard key={item.url} item={item} />)}
      </div>

      <div style={{ fontSize: '15px', fontWeight: 800, color: C.textSecondary, margin: '4px 0 12px' }}>
        외부 연동 시스템
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', marginBottom: '8px' }}>
        {EXTERNAL_SYSTEMS.map((item) => <SystemCard key={item.url} item={item} />)}
      </div>

      <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '18px', lineHeight: 1.6 }}>
        ※ 위 시스템들은 ERP 2.0과 별도 서버에서 운영되고 있어 새 탭으로 열립니다. 사내 네트워크(사내 서버 접속 가능한 환경)에서만 접속됩니다.
      </div>
    </div>
  );
}
