// src/pages/ExpensePage.jsx
// 지출결의서 기능 컨테이너 — 대시보드 / 목록 / 작성 / 정기초안 / 출력·결재함 / 결재완료 처리 / 계좌 관리 탭을 묶습니다.
import React, { useState } from 'react';
import ExpenseDashboard from '../components/expense/ExpenseDashboard';
import ExpenseList from '../components/expense/ExpenseList';
import ExpenseForm from '../components/expense/ExpenseForm';
import RecurringDraft from '../components/expense/RecurringDraft';
import ExpensePrint from '../components/expense/ExpensePrint';
import ExpenseApproval from '../components/expense/ExpenseApproval';
import BankAccountManager from '../components/expense/BankAccountManager';

const TABS = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'list', label: '목록' },
  { key: 'form', label: '작성' },
  { key: 'recurring', label: '정기초안' },
  { key: 'print', label: '출력 · 결재함' },
  { key: 'approval', label: '결재완료 처리' },
  { key: 'accounts', label: '계좌 관리' },
];

function ExpensePage() {
  const [tab, setTab] = useState('dashboard');
  // 목록/결재완료 처리에서 특정 건을 골라 출력·처리 탭으로 넘길 때 사용
  const [activeRequestId, setActiveRequestId] = useState(null);
  // 대시보드에서 목록으로 넘어올 때 적용할 상태 필터 (건드릴 때마다 값을 바꿔 목록을 새로 마운트합니다)
  const [listInitialStatus, setListInitialStatus] = useState(null);

  const goToPrint = (id) => { setActiveRequestId(id); setTab('print'); };
  const goToApproval = (id) => { setActiveRequestId(id); setTab('approval'); };
  const goToForm = (id) => { setActiveRequestId(id); setTab('form'); };
  const goToListWithStatus = (status) => { setListInitialStatus(status); setTab('list'); };

  return (
    <div className="expense-shell" style={styles.container}>
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

      <div className="expense-content" style={styles.content}>
        {tab === 'dashboard' && (
          <ExpenseDashboard
            onGoList={goToListWithStatus}
            onGoRecurring={() => setTab('recurring')}
          />
        )}
        {tab === 'list' && (
          <ExpenseList
            key={listInitialStatus || 'all'}
            initialStatus={listInitialStatus}
            onOpenPrint={goToPrint}
            onOpenApproval={goToApproval}
            onOpenForm={goToForm}
            onNew={() => { setActiveRequestId(null); setTab('form'); }}
          />
        )}
        {tab === 'form' && (
          <ExpenseForm
            requestId={activeRequestId}
            onSaved={(id) => goToPrint(id)}
            onCancel={() => setTab('list')}
          />
        )}
        {tab === 'recurring' && (
          <RecurringDraft onOpenForm={goToForm} />
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
          .expense-shell {
            padding: 0 !important;
            background: white !important;
            min-height: 0 !important;
          }
          .expense-content {
            padding: 0 !important;
            background: white !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            min-height: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { padding: '36px', backgroundColor: '#e2e8f0', minHeight: '100vh' },
  tabBar: { display: 'flex', gap: '7px', flexWrap: 'wrap' },
  activeTab: { padding: '16px 30px', backgroundColor: 'white', color: '#3182ce', border: 'none', borderRadius: '14px 14px 0 0', fontWeight: 700, cursor: 'pointer', fontSize: '18px' },
  inactiveTab: { padding: '16px 30px', backgroundColor: '#cbd5e0', color: '#4a5568', border: 'none', borderRadius: '14px 14px 0 0', fontWeight: 700, cursor: 'pointer', fontSize: '18px' },
  content: { backgroundColor: 'white', padding: '36px', borderRadius: '0 18px 18px 18px', boxShadow: '0 6px 16px rgba(0,0,0,0.06)', minHeight: '70vh' },
};

export default ExpensePage;
