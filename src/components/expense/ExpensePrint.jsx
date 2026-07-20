// src/components/expense/ExpensePrint.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function ExpensePrint({ requestId, onBack }) {
  const [request, setRequest] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (requestId) load(requestId);
  }, [requestId]);

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
        <div style={styles.approvalBox}>
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

        <h1 style={styles.formTitle}>지출결의서</h1>

        <div style={styles.metaRow}>
          <span style={styles.metaItem}>일자: {request.request_date}</span>
          <span style={styles.metaItem}>출금계좌: {request.company_bank_accounts ? `${request.company_bank_accounts.bank_name} ${request.company_bank_accounts.account_no}` : '-'}</span>
          <span style={styles.metaItem}>지급방법: 계좌이체</span>
        </div>

        <table style={styles.itemTable} className="expense-print-table">
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '21%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={styles.th}>NO</th>
              <th style={styles.th}>거래처</th>
              <th style={styles.th}>품목</th>
              <th style={styles.th}>금액</th>
              <th style={styles.th}>입금은행</th>
              <th style={styles.th}>계좌번호</th>
              <th style={styles.th}>예금주</th>
              <th style={styles.th}>통장표시</th>
              <th style={styles.th}>비고</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td style={{ ...styles.td, textAlign: 'center' }}>{it.line_no}</td>
                <td style={styles.td}>{it.vendor_name}</td>
                <td style={styles.td}>{it.item_name}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{Number(it.amount).toLocaleString()}</td>
                <td style={styles.td}>{it.bank_name || ''}</td>
                <td style={styles.td}>{it.account_no || ''}</td>
                <td style={styles.td}>{it.account_holder || ''}</td>
                <td style={styles.td}>{it.passbook_memo || ''}</td>
                <td style={styles.td}>{it.note || ''}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>합계</td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>{total.toLocaleString()}</td>
              <td colSpan={5} style={styles.td}></td>
            </tr>
          </tbody>
        </table>

        <p style={styles.footNote}>※ 결재 바랍니다</p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .expense-print-sheet {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
          }
          .expense-print-table th,
          .expense-print-table td {
            font-size: 15px !important;
            padding: 7px 6px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  emptyText: { color: '#718096', fontSize: '18px' },
  controlBar: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  backBtn: { padding: '12px 20px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '17px', fontWeight: 700 },
  printBtn: { padding: '12px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '17px' },
  sheet: { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '40px', maxWidth: '900px', margin: '0 auto', fontSize: '19px', wordBreak: 'keep-all' },
  approvalBox: { display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' },
  approvalTable: { borderCollapse: 'collapse' },
  approvalLabel: { border: '1px solid #2d3748', padding: '8px 12px', textAlign: 'center', fontSize: '17px', backgroundColor: '#f7fafc' },
  approvalHeadCell: { border: '1px solid #2d3748', padding: '8px 16px', textAlign: 'center', fontSize: '17px', backgroundColor: '#f7fafc' },
  approvalStampCell: { border: '1px solid #2d3748', width: '68px', height: '62px' },
  formTitle: { textAlign: 'center', fontSize: '32px', fontWeight: 800, letterSpacing: '10px', margin: '14px 0 28px 0' },
  metaRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 20px', marginBottom: '14px', fontSize: '20px' },
  metaItem: { whiteSpace: 'nowrap' },
  itemTable: { width: '100%', borderCollapse: 'collapse', fontSize: '18px', tableLayout: 'fixed', wordBreak: 'keep-all' },
  th: { border: '1px solid #2d3748', padding: '12px 8px', backgroundColor: '#f7fafc', fontWeight: 700, wordBreak: 'keep-all' },
  td: { border: '1px solid #cbd5e0', padding: '12px 8px', wordBreak: 'keep-all', overflowWrap: 'break-word' },
  footNote: { marginTop: '24px', fontSize: '19px' },
};

export default ExpensePrint;
