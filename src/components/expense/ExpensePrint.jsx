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
    return <p style={{ color: '#718096' }}>목록에서 출력할 지출결의서를 선택해주세요.</p>;
  }
  if (loading) return <p style={{ color: '#718096' }}>불러오는 중...</p>;
  if (!request) return <p style={{ color: '#718096' }}>결의서를 찾을 수 없습니다.</p>;

  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  return (
    <div>
      <div className="no-print" style={styles.controlBar}>
        <button onClick={onBack} style={styles.backBtn}>← 목록으로</button>
        <button onClick={() => window.print()} style={styles.printBtn}>🖨️ 인쇄</button>
      </div>

      <div className="printable-area" style={styles.sheet}>
        <div style={styles.approvalBox}>
          <table style={styles.approvalTable}>
            <thead>
              <tr>
                <td rowSpan={2} style={styles.approvalLabel}>결재</td>
                <td style={styles.approvalHeadCell}>이사</td>
                <td style={styles.approvalHeadCell}>실장</td>
                <td style={styles.approvalHeadCell}>사장</td>
              </tr>
              <tr>
                <td style={styles.approvalStampCell}></td>
                <td style={styles.approvalStampCell}></td>
                <td style={styles.approvalStampCell}></td>
              </tr>
            </thead>
          </table>
        </div>

        <h1 style={styles.formTitle}>지출결의서</h1>

        <div style={styles.metaRow}>
          <span>일자: {request.request_date}</span>
          <span>출금계좌: {request.company_bank_accounts ? `${request.company_bank_accounts.bank_name} ${request.company_bank_accounts.account_no}` : '-'}</span>
        </div>

        <table style={styles.itemTable}>
          <thead>
            <tr>
              <th style={styles.th}>NO</th>
              <th style={styles.th}>거래처</th>
              <th style={styles.th}>품목</th>
              <th style={styles.th}>금액</th>
              <th style={styles.th}>지급방법</th>
              <th style={styles.th}>입금계좌</th>
              <th style={styles.th}>통장표시</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td style={styles.td}>{it.line_no}</td>
                <td style={styles.td}>{it.vendor_name}</td>
                <td style={styles.td}>{it.item_name}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{Number(it.amount).toLocaleString()}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{it.payment_method}</td>
                <td style={styles.td}>{it.bank_name ? `${it.bank_name} ${it.account_no || ''}` : '-'}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{it.passbook_memo || '-'}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>합계</td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>{total.toLocaleString()}</td>
              <td colSpan={3} style={styles.td}></td>
            </tr>
          </tbody>
        </table>

        <p style={styles.footNote}>※ 결재 바랍니다</p>
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
  controlBar: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  backBtn: { padding: '8px 16px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  printBtn: { padding: '8px 16px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  sheet: { border: '1px solid #e2e8f0', padding: '30px', maxWidth: '800px', margin: '0 auto' },
  approvalBox: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' },
  approvalTable: { borderCollapse: 'collapse' },
  approvalLabel: { border: '1px solid #2d3748', padding: '4px 8px', textAlign: 'center', fontSize: '12px', backgroundColor: '#f7fafc' },
  approvalHeadCell: { border: '1px solid #2d3748', padding: '4px 14px', textAlign: 'center', fontSize: '12px', backgroundColor: '#f7fafc' },
  approvalStampCell: { border: '1px solid #2d3748', width: '60px', height: '50px' },
  formTitle: { textAlign: 'center', fontSize: '24px', letterSpacing: '8px', margin: '10px 0 24px 0' },
  metaRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' },
  itemTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { border: '1px solid #2d3748', padding: '8px 6px', backgroundColor: '#f7fafc' },
  td: { border: '1px solid #cbd5e0', padding: '7px 6px' },
  footNote: { marginTop: '20px', fontSize: '14px' },
};

export default ExpensePrint;
