// src/components/expense/ExpenseApproval.jsx
// 결재완료 처리: 결재대기 상태인 지출결의서를 골라 결재 스캔본을 업로드하면 결재완료로 전환됩니다.
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const BUCKET = 'expense-scans';

function ExpenseApproval({ requestId, onDone }) {
  const [pending, setPending] = useState([]);
  const [selectedId, setSelectedId] = useState(requestId || null);
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPending(); }, []);
  useEffect(() => { setSelectedId(requestId || null); }, [requestId]);
  useEffect(() => { if (selectedId) loadSelected(selectedId); else setSelected(null); }, [selectedId]);

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('expense_requests')
      .select('*, company_bank_accounts(bank_name, account_no)')
      .eq('status', '결재대기')
      .order('request_date', { ascending: false });
    setPending(data || []);
    setLoading(false);
  };

  const loadSelected = async (id) => {
    const { data } = await supabase
      .from('expense_requests')
      .select('*, company_bank_accounts(bank_name, account_no)')
      .eq('id', id)
      .single();
    setSelected(data || null);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.size > 15 * 1024 * 1024) {
      alert('파일 용량은 15MB 이하로 올려주세요.');
      e.target.value = '';
      return;
    }
    setFile(f || null);
  };

  const handleUpload = async () => {
    if (!selected) return;
    if (!file) { alert('결재 스캔 파일을 선택해주세요.'); return; }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-가-힣]/g, '_');
      const filePath = `requests/${selected.id}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('expense_requests')
        .update({
          status: '결재완료',
          approved_file_path: filePath,
          approved_file_name: file.name,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selected.id);
      if (updateError) throw updateError;

      alert('결재완료 처리되었습니다.');
      setFile(null);
      fetchPending();
      if (onDone) onDone();
    } catch (err) {
      alert('업로드 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p style={styles.emptyText}>불러오는 중...</p>;

  return (
    <div>
      <h2 style={styles.title}>결재완료 처리</h2>
      <p style={styles.subtitle}>이사·실장·사장 결재가 모두 끝난 지출결의서를 골라 스캔 파일을 업로드하세요.</p>

      <div style={styles.layout}>
        <div style={styles.listCol}>
          {pending.length === 0 ? (
            <p style={styles.emptyText}>결재대기 중인 건이 없습니다.</p>
          ) : (
            pending.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{ ...styles.pendingItem, ...(selectedId === r.id ? styles.pendingItemActive : {}) }}
              >
                <div style={styles.pendingDate}>{r.request_date}</div>
                <div style={styles.pendingAccount}>
                  {r.company_bank_accounts ? `${r.company_bank_accounts.bank_name} ${r.company_bank_accounts.account_no}` : '-'}
                </div>
                <div style={styles.pendingAmount}>{Number(r.total_amount || 0).toLocaleString()}원</div>
              </div>
            ))
          )}
        </div>

        <div style={styles.detailCol}>
          {selected ? (
            <>
              <div style={styles.detailHeader}>
                <div style={styles.detailMain}>{selected.request_date} · {selected.company_bank_accounts ? `${selected.company_bank_accounts.bank_name} ${selected.company_bank_accounts.account_no}` : '-'}</div>
                <div style={styles.detailAmount}>합계 {Number(selected.total_amount || 0).toLocaleString()}원</div>
              </div>
              <label style={styles.label}>결재 스캔 파일 (이미지 또는 PDF)</label>
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange} style={styles.fileInput} />
              <button onClick={handleUpload} disabled={uploading} style={styles.uploadBtn}>
                {uploading ? '업로드 중...' : '결재완료 처리'}
              </button>
            </>
          ) : (
            <p style={styles.emptyText}>왼쪽에서 처리할 건을 선택해주세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  title: { margin: '0 0 10px 0', fontSize: '30px', fontWeight: 800, color: '#1a365d' },
  subtitle: { margin: '0 0 28px 0', fontSize: '17px', color: '#718096' },
  emptyText: { color: '#718096', fontSize: '18px' },
  layout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '28px' },
  listCol: { display: 'flex', flexDirection: 'column', gap: '12px' },
  pendingItem: { padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' },
  pendingItemActive: { borderColor: '#3182ce', borderWidth: '2px', backgroundColor: '#ebf8ff' },
  pendingDate: { fontWeight: 700, fontSize: '18px' },
  pendingAccount: { fontSize: '15px', color: '#718096', marginTop: '3px' },
  pendingAmount: { fontSize: '17px', marginTop: '5px', fontWeight: 700 },
  detailCol: { display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' },
  detailHeader: { display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '7px' },
  detailMain: { fontSize: '19px', fontWeight: 700 },
  detailAmount: { fontSize: '17px', color: '#4a5568' },
  label: { fontSize: '17px', fontWeight: 700, color: '#4a5568' },
  fileInput: { fontSize: '17px' },
  uploadBtn: { padding: '15px 26px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '11px', cursor: 'pointer', fontWeight: 700, fontSize: '17px' },
};

export default ExpenseApproval;
