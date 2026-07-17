// src/components/expense/BankAccountManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const emptySpecial = () => ({ bank_account_id: '', recipient: '', amount: '', purpose: '', note: '' });

function BankAccountManager() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ bank_name: '', account_no: '', purpose: '' });
  const [saving, setSaving] = useState(false);
  const [balanceDrafts, setBalanceDrafts] = useState({});
  const [special, setSpecial] = useState(emptySpecial());
  const [specialSaving, setSpecialSaving] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data } = await supabase.from('company_bank_accounts').select('*').order('id');
    setAccounts(data || []);
    const drafts = {};
    (data || []).forEach((a) => { drafts[a.id] = a.balance ?? 0; });
    setBalanceDrafts(drafts);
    setLoading(false);
  };

  const saveBalance = async (acc) => {
    const val = Number(balanceDrafts[acc.id]);
    if (Number.isNaN(val)) { alert('잔액은 숫자로 입력해주세요.'); return; }
    const { error } = await supabase.from('company_bank_accounts').update({ balance: val, balance_updated_at: new Date().toISOString() }).eq('id', acc.id);
    if (error) { alert('잔액 저장 실패: ' + error.message); return; }
    fetchAccounts();
  };

  const submitSpecial = async () => {
    if (!special.bank_account_id) { alert('출금계좌를 선택해주세요.'); return; }
    if (!special.recipient) { alert('수령인을 입력해주세요.'); return; }
    if (!special.amount || Number(special.amount) <= 0) { alert('금액을 입력해주세요.'); return; }
    if (!special.purpose) { alert('용도를 입력해주세요. 용도를 적지 않으면 저장할 수 없습니다.'); return; }

    setSpecialSaving(true);
    try {
      const { data: req, error } = await supabase.from('expense_requests').insert({
        request_date: new Date().toISOString().split('T')[0],
        bank_account_id: special.bank_account_id,
        total_amount: Number(special.amount),
        status: '결재대기',
        request_type: '특수이체',
        purpose_note: special.purpose,
      }).select('id').single();
      if (error) throw error;

      const { error: itemError } = await supabase.from('expense_request_items').insert({
        request_id: req.id,
        line_no: 1,
        vendor_name: special.recipient,
        item_name: special.purpose,
        amount: Number(special.amount),
        payment_method: '계좌이체',
        note: special.note || null,
      });
      if (itemError) throw itemError;

      alert('특수 이체 건이 등록되어 결재대기 상태로 들어갔습니다.');
      setSpecial(emptySpecial());
    } catch (err) {
      alert('등록 실패: ' + err.message);
    } finally {
      setSpecialSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!form.bank_name || !form.account_no) { alert('은행명과 계좌번호를 입력해주세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('company_bank_accounts').insert({
      bank_name: form.bank_name, account_no: form.account_no, purpose: form.purpose || null,
    });
    setSaving(false);
    if (error) { alert('등록 실패: ' + error.message); return; }
    setForm({ bank_name: '', account_no: '', purpose: '' });
    fetchAccounts();
  };

  const toggleActive = async (acc) => {
    await supabase.from('company_bank_accounts').update({ is_active: !acc.is_active }).eq('id', acc.id);
    fetchAccounts();
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`${acc.bank_name} ${acc.account_no} 계좌를 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('company_bank_accounts').delete().eq('id', acc.id);
    if (error) { alert('삭제 실패: 이 계좌를 사용하는 지출결의서가 있으면 삭제할 수 없습니다.'); return; }
    fetchAccounts();
  };

  return (
    <div>
      <h2 style={styles.title}>계좌 관리</h2>
      <p style={styles.subtitle}>지출결의서 작성 화면의 출금계좌 목록입니다. 용도별로 여러 계좌를 등록할 수 있습니다.</p>

      <div style={styles.formRow}>
        <input placeholder="은행명" value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} style={styles.input} />
        <input placeholder="계좌번호" value={form.account_no} onChange={(e) => setForm((f) => ({ ...f, account_no: e.target.value }))} style={styles.input} />
        <input placeholder="용도 (예: 원자재대금)" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} style={styles.input} />
        <button onClick={handleAdd} disabled={saving} style={styles.addBtn}>계좌 등록</button>
      </div>

      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>은행명</th>
                <th style={styles.th}>계좌번호</th>
                <th style={styles.th}>용도</th>
                <th style={{ ...styles.th, width: '220px' }}>잔액</th>
                <th style={styles.th}>사용 여부</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const changed = Number(balanceDrafts[a.id]) !== Number(a.balance || 0);
                return (
                  <tr key={a.id} style={styles.tr}>
                    <td style={styles.td}>{a.bank_name}</td>
                    <td style={styles.td}>{a.account_no}</td>
                    <td style={styles.td}>{a.purpose || '-'}</td>
                    <td style={styles.td}>
                      <div style={styles.balanceCell}>
                        <input
                          type="number"
                          value={balanceDrafts[a.id] ?? 0}
                          onChange={(e) => setBalanceDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                          style={styles.balanceInput}
                        />
                        {changed && <button onClick={() => saveBalance(a)} style={styles.balanceSaveBtn}>저장</button>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => toggleActive(a)} style={a.is_active ? styles.activeBadge : styles.inactiveBadge}>
                        {a.is_active ? '사용' : '중지'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleDelete(a)} style={styles.deleteBtn}>삭제</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.specialBox}>
        <h3 style={styles.specialTitle}>대표 인출 / 특수 이체 등록</h3>
        <p style={styles.specialDesc}>정기 고정비·비정기 매입이 아닌 이체(대표 인출 등)는 용도를 반드시 적어야 등록할 수 있습니다. 등록 즉시 결재대기 상태로 들어갑니다.</p>
        <div style={styles.specialGrid}>
          <div style={styles.field}>
            <label style={styles.label}>출금계좌 *</label>
            <select value={special.bank_account_id} onChange={(e) => setSpecial((s) => ({ ...s, bank_account_id: e.target.value }))} style={styles.input}>
              <option value="">선택하세요</option>
              {accounts.filter((a) => a.is_active).map((a) => (
                <option key={a.id} value={a.id}>{a.bank_name} {a.account_no}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>수령인 *</label>
            <input value={special.recipient} onChange={(e) => setSpecial((s) => ({ ...s, recipient: e.target.value }))} style={styles.input} placeholder="예: 남은우 대표" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>금액 *</label>
            <input type="number" value={special.amount} onChange={(e) => setSpecial((s) => ({ ...s, amount: e.target.value }))} style={styles.input} placeholder="0" />
          </div>
          <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
            <label style={styles.label}>용도 (필수) — 예: 정부지원사업 자금 집행 / 대표 가지급금</label>
            <input value={special.purpose} onChange={(e) => setSpecial((s) => ({ ...s, purpose: e.target.value }))} style={styles.input} placeholder="용도를 입력하세요" />
          </div>
          <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
            <label style={styles.label}>비고 (선택)</label>
            <input value={special.note} onChange={(e) => setSpecial((s) => ({ ...s, note: e.target.value }))} style={styles.input} placeholder="선택 입력" />
          </div>
        </div>
        <div style={styles.specialActions}>
          <button onClick={submitSpecial} disabled={specialSaving} style={styles.specialSubmitBtn}>결재대기로 등록</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  title: { margin: '0 0 12px 0', fontSize: '32px', fontWeight: 800, color: '#1a365d' },
  subtitle: { margin: '0 0 30px 0', fontSize: '18px', color: '#718096' },
  formRow: { display: 'flex', gap: '16px', marginBottom: '30px', flexWrap: 'wrap' },
  input: { padding: '14px 16px', borderRadius: '10px', border: '1px solid #dfe4ea', fontSize: '19px', flex: 1, minWidth: '160px', backgroundColor: '#fbfcfe' },
  addBtn: { padding: '14px 26px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '18px' },
  emptyText: { color: '#718096', fontSize: '19px' },
  tableWrapper: { overflowX: 'auto', borderRadius: '14px', border: '1px solid #edf1f5' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '18px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  th: { padding: '16px 13px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontSize: '17px', fontWeight: 700 },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '15px 13px' },
  activeBadge: { padding: '8px 17px', backgroundColor: '#e3f6df', color: '#276749', border: 'none', borderRadius: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 700 },
  inactiveBadge: { padding: '8px 17px', backgroundColor: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 700 },
  deleteBtn: { padding: '10px 16px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '16px', fontWeight: 700 },
  balanceCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  balanceInput: { width: '130px', padding: '9px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px' },
  balanceSaveBtn: { padding: '9px 14px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
  specialBox: { marginTop: '44px', padding: '28px', backgroundColor: '#ebf4fb', borderRadius: '18px', border: '1.5px solid #90cdf4' },
  specialTitle: { margin: '0 0 10px 0', fontSize: '22px', fontWeight: 800, color: '#1a365d' },
  specialDesc: { margin: '0 0 22px 0', color: '#4a5568', fontSize: '16px', lineHeight: 1.6 },
  specialGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '15px', fontWeight: 700, color: '#4a5568' },
  specialActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '24px' },
  specialSubmitBtn: { padding: '15px 28px', backgroundColor: '#1a365d', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '17px' },
};

export default BankAccountManager;
