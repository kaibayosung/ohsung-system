// src/pages/ExpensePage.jsx
// 지출결의서 기능 컨테이너 — 목록 / 작성 / 출력·결재함 / 결재완료 처리 / 계좌 관리 탭을 묶습니다.
import React, { useState } from 'react';
import ExpenseList from '../components/expense/ExpenseList';
import ExpenseForm from '../components/expense/ExpenseForm';
import ExpensePrint from '../components/expense/ExpensePrint';
import ExpenseApproval from '../components/expense/ExpenseApproval';
import BankAccountManager from '../components/expense/BankAccountManager';

const TABS = [
  { key: 'list', label: '목록' },
  { key: 'form', label: '작성' },
  { key: 'print', label: '출력 · 결재함' },
  { key: 'approval', label: '결재완료 처리' },
  { key: 'accounts', label: '계좌 관리' },
];

function ExpensePage() {
  const [tab, setTab] = useState('list');
  // 목록/결재완료 처리에서 특정 건을 골라 출력·처리 탭으로 넘길 때 사용
  const [activeRequestId, setActiveRequestId] = useState(null);

  const goToPrint = (id) => { setActiveRequestId(id); setTab('print'); };
  const goToApproval = (id) => { setActiveRequestId(id); setTab('approval'); };
  const goToForm = (id) => { setActiveRequestId(id); setTab('form'); };

  return (
    <div style={styles.container}>
      <div className="no-print" style={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? styles.activeTab : styles.inactiveTab}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {tab === 'list' && (
          <ExpenseList onOpenPrint={goToPrint} onOpenApproval={goToApproval} onOpenForm={goToForm} onNew={() => { setActiveRequestId(null); setTab('form'); }} />
        )}
        {tab === 'form' && (
          <ExpenseForm
            requestId={activeRequestId}
            onSaved={(id) => goToPrint(id)}
            onCancel={() => setTab('list')}
          />
        )}
        {tab === 'print' && (
          <ExpensePrint requestId={activeRequestId} onBack={() => setTab('list')} />
        )}
        {tab === 'approval' && (
          <ExpenseApproval requestId={activeRequestId} onDone={() => setTab('list')} />
        )}
        {tab === 'accounts' && <BankAccountManager />}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { padding: '24px', backgroundColor: '#e2e8f0', minHeight: '100vh' },
  tabBar: { display: 'flex', gap: '6px' },
  activeTab: { padding: '14px 26px', backgroundColor: 'white', color: '#3182ce', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 700, cursor: 'pointer', fontSize: '16px' },
  inactiveTab: { padding: '14px 26px', backgroundColor: '#cbd5e0', color: '#4a5568', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 700, cursor: 'pointer', fontSize: '16px' },
  content: { backgroundColor: 'white', padding: '30px', borderRadius: '0 16px 16px 16px', boxShadow: '0 6px 16px rgba(0,0,0,0.06)', minHeight: '70vh' },
};

export default ExpensePage;
