// src/components/expense/ExpensePrint.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function ExpensePrint({ requestId, onBack }) {
  const [request, setRequest] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async (id) => {
    setLoading(true);
    const { data: req } = await supabase
      .from('expense_requests')
      .select('*, company_bank_accounts(bank_name, account_no)')
      .eq('id', id)
      .single();
    const { data: its } = await supabase.from('expense_request_items').select('*').eq('request_id', id).order('line_no');
    setRequest(req || null);
    setItems(its || []);
    setLoading(false);
  };

  useEffect(() => {
    if (requestId) load(requestId);
  }, [requestId]);

  if (!requestId) {
    return <p style={styles.emptyText}>목록에서 출력할 지출결의서를 선택해주세요.</p>;
  }
  if (loading) return <p style={styles.emptyText}>불러오는 중...</p>;
  if (!request) return <p style={styles.emptyText}>결의서를 찾을 수 없습니다.</p>;

  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  return (
    <div>
      <div className="no-print" style={styles.controlBar}>
        <button onClick={onBack} style={styles.backBtn}>← 목록으로</button>
        <button onClick={() => window.print()} style={styles.printBtn}>🖨️ 인쇄</button>
      </div>

      <div className="printable-area expense-print-sheet" style={styles.sheet}>
        <div style={styles.approvalBox} className="expense-print-approval">
          <div style={styles.approvalWrap}>
            <table style={styles.approvalTable}>
              <thead>
                <tr>
                  <td rowSpan={2} style={styles.approvalLabel}>결재</td>
                  <td style={styles.approvalHeadCell}>과장</td>
                  <td style={styles.approvalHeadCell}>이사</td>
                  <td style={styles.approvalHeadCell}>실장</td>
                  <td style={styles.approvalHeadCell}>사장</td>
                </tr>
                <tr>
                  <td style={styles.approvalStampCell}></td>
                  <td style={styles.approvalStampCell}></td>
                  <td style={styles.approvalStampCell}></td>
                  <td style={styles.approvalStampCell}></td>
                </tr>
              </thead>
            </table>
          </div>
        </div>

        <h1 style={styles.formTitle}>지 출 결 의 서</h1>
        <div style={styles.titleAccent} />

        <div style={styles.metaRow} className="expense-print-meta">
          <span style={styles.metaGroup}>
            <span style={styles.metaLabel} className="expense-print-meta-label">일자</span>
            <span style={styles.metaValue} className="expense-print-meta-value">{request.request_date}</span>
          </span>
          <span style={styles.metaGroup}>
            <span style={styles.metaLabel} className="expense-print-meta-label">출금계좌</span>
            <span style={styles.metaValue} className="expense-print-meta-value">{request.company_bank_accounts ? `${request.company_bank_accounts.bank_name} ${request.company_bank_accounts.account_no}` : '-'}</span>
          </span>
          <span style={styles.metaGroup}>
            <span style={styles.metaLabel} className="expense-print-meta-label">지급방법</span>
            <span style={styles.metaValue} className="expense-print-meta-value">계좌이체</span>
          </span>
        </div>

        <div style={styles.itemTableWrap}>
          <table style={styles.itemTable} className="expense-print-table">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={styles.th}>NO</th>
                <th style={styles.th}>거래처</th>
                <th style={styles.thAmount}>금액</th>
                <th style={styles.th} className="expense-print-tight">입금은행</th>
                <th style={styles.th} className="expense-print-tight">계좌번호</th>
                <th style={styles.th} className="expense-print-tight">예금주</th>
                <th style={styles.th} className="expense-print-tight">통장표시</th>
                <th style={styles.th} className="expense-print-note">비고</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#a0a4b8' }}>{it.line_no}</td>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#1a1a2e' }}>{it.vendor_name}</td>
                  <td style={styles.tdAmount}>{Number(it.amount).toLocaleString()}</td>
                  <td style={styles.td} className="expense-print-tight">{it.bank_name || ''}</td>
                  <td style={styles.td} className="expense-print-tight">{it.account_no || ''}</td>
                  <td style={styles.td} className="expense-print-tight">{it.account_holder || ''}</td>
                  <td style={styles.td} className="expense-print-tight">{it.passbook_memo || ''}</td>
                  <td style={{ ...styles.td, color: '#9ca3af' }} className="expense-print-note">{it.note || ''}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={styles.totalLabelCell}>합계</td>
                <td style={styles.totalValueCell}>{total.toLocaleString()}</td>
                <td colSpan={5} style={styles.totalFillerCell}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={styles.footNote} className="expense-print-foot">※ 결재 바랍니다.</p>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          .no-print { display: none !important; }
          body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .expense-print-sheet {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .expense-print-table th,
          .expense-print-table td {
            font-size: 16px !important;
            padding: 8px 6px !important;
          }
          .expense-print-table .expense-print-tight {
            font-size: 14px !important;
            padding: 8px 4px !important;
            white-space: nowrap !important;
            letter-spacing: -0.2px !important;
          }
          .expense-print-table .expense-print-note {
            font-size: 12px !important;
            padding: 8px 4px !important;
            white-space: normal !important;
            word-break: break-all !important;
            line-height: 1.3 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .expense-print-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .expense-print-sheet h1 {
            font-size: 27px !important;
            margin: 6px 0 8px 0 !important;
          }
          .expense-print-sheet .expense-print-meta {
            margin-bottom: 14px !important;
          }
          .expense-print-sheet .expense-print-meta-label {
            font-size: 14px !important;
          }
          .expense-print-sheet .expense-print-meta-value {
            font-size: 17px !important;
          }
          .expense-print-sheet .expense-print-approval td {
            padding: 7px 12px !important;
            font-size: 15px !important;
          }
          .expense-print-sheet .expense-print-foot {
            margin-top: 14px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
    </div>
  );
}

// 인디고/바이올렛 계열 강조색 — 사장님이 전달한 레이아웃 시안 기준
const ACCENT = '#5b52d6';
const HEADER_BG = '#2e2b45';
const APPROVAL_BG = '#eeecfb';
const BORDER = '#e5e7eb';
const TEXT_PRIMARY = '#1a1a2e';
const MUTED = '#9ca3af';

const styles = {
  emptyText: { color: '#718096', fontSize: '18px' },
  controlBar: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  backBtn: { padding: '12px 20px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '17px', fontWeight: 700 },
  printBtn: { padding: '12px 20px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '17px' },
  sheet: { border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '40px', maxWidth: '900px', margin: '0 auto', fontSize: '19px', wordBreak: 'keep-all', color: TEXT_PRIMARY },

  approvalBox: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' },
  approvalWrap: { border: `1px solid ${BORDER}`, borderRadius: '10px', overflow: 'hidden' },
  approvalTable: { borderCollapse: 'collapse' },
  approvalLabel: { padding: '10px 14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, backgroundColor: APPROVAL_BG, color: TEXT_PRIMARY, borderRight: `1px solid ${BORDER}` },
  approvalHeadCell: { padding: '10px 18px', textAlign: 'center', fontSize: '15px', fontWeight: 700, color: TEXT_PRIMARY, borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` },
  approvalStampCell: { width: '64px', height: '54px', borderLeft: `1px solid ${BORDER}` },

  formTitle: { textAlign: 'center', fontSize: '30px', fontWeight: 800, letterSpacing: '6px', margin: '8px 0 10px 0', color: TEXT_PRIMARY },
  titleAccent: { width: '64px', height: '4px', backgroundColor: ACCENT, borderRadius: '2px', margin: '0 auto 22px auto' },

  metaRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 24px', marginBottom: '18px' },
  metaGroup: { display: 'inline-flex', alignItems: 'baseline', gap: '8px', whiteSpace: 'nowrap' },
  metaLabel: { fontSize: '15px', color: MUTED, fontWeight: 700 },
  metaValue: { fontSize: '19px', color: TEXT_PRIMARY, fontWeight: 700 },

  itemTableWrap: { border: `1px solid ${BORDER}`, borderRadius: '10px', overflow: 'hidden' },
  itemTable: { width: '100%', borderCollapse: 'collapse', fontSize: '17px', tableLayout: 'fixed', wordBreak: 'keep-all' },
  th: { padding: '12px 8px', backgroundColor: HEADER_BG, color: '#ffffff', fontWeight: 700, textAlign: 'left', wordBreak: 'keep-all' },
  thAmount: { padding: '12px 8px', backgroundColor: HEADER_BG, color: '#ffffff', fontWeight: 700, textAlign: 'right' },
  td: { padding: '12px 8px', borderTop: `1px solid ${BORDER}`, wordBreak: 'keep-all', overflowWrap: 'break-word', color: TEXT_PRIMARY },
  tdAmount: { padding: '12px 10px', borderTop: `1px solid ${BORDER}`, textAlign: 'right', whiteSpace: 'nowrap', color: ACCENT, fontWeight: 700 },
  totalLabelCell: { padding: '14px 8px', textAlign: 'right', fontWeight: 800, color: TEXT_PRIMARY, borderTop: `2px solid ${TEXT_PRIMARY}` },
  totalValueCell: { padding: '14px 10px', textAlign: 'right', fontWeight: 800, color: ACCENT, fontSize: '19px', whiteSpace: 'nowrap', borderTop: `2px solid ${TEXT_PRIMARY}` },
  totalFillerCell: { borderTop: `2px solid ${TEXT_PRIMARY}` },

  footNote: { marginTop: '20px', fontSize: '17px', fontWeight: 700, color: TEXT_PRIMARY },
};

export default ExpensePrint;
