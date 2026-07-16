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

  if (loading) return <p style={{ color: '#718096' }}>불러오는 중...</p>;

  return (
    <div>
      <h2 style={styles.title}>결재완료 처리</h2>
      <p style={styles.subtitle}>이사·실장·사장 결재가 모두 끝난 지출결의서를 골라 스캔 파일을 업로드하세요.</p>

      <div style={styles.layout}>
        <div style={styles.listCol}>
          {pending.length === 0 ? (
            <p style={{ color: '#718096' }}>결재대기 중인 건이 없습니다.</p>
          ) : (
            pending.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{ ...styles.pendingItem, ...(selectedId === r.id ? styles.pendingItemActive : {}) }}
              >
                <div style={{ fontWeight: 'bold' }}>{r.request_date}</div>
                <div style={{ fontSize: '12px', color: '#718096' }}>
                  {r.company_bank_accounts ? `${r.company_bank_accounts.bank_name} ${r.company_bank_accounts.account_no}` : '-'}
                </div>
                <div style={{ fontSize: '13px' }}>{Number(r.total_amount || 0).toLocaleString()}원</div>
              </div>
            ))
          )}
        </div>

        <div style={styles.detailCol}>
          {selected ? (
            <>
              <div style={styles.detailHeader}>
                <div><strong>{selected.request_date}</strong> · {selected.company_bank_accounts ? `${selected.company_bank_accounts.bank_name} ${selected.company_bank_accounts.account_no}` : '-'}</div>
                <div>합계 {Number(selected.total_amount || 0).toLocaleString()}원</div>
              </div>
              <label style={styles.label}>결재 스캔 파일 (이미지 또는 PDF)</label>
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange} />
              <button onClick={handleUpload} disabled={uploading} style={styles.uploadBtn}>
                {uploading ? '업로드 중...' : '결재완료 처리'}
              </button>
            </>
          ) : (
            <p style={{ color: '#718096' }}>왼쪽에서 처리할 건을 선택해주세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  title: { margin: '0 0 6px 0', fontSize: '20px', color: '#1a365d' },
  subtitle: { margin: '0 0 18px 0', fontSize: '13px', color: '#718096' },
  layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' },
  listCol: { display: 'flex', flexDirection: 'column', gap: '8px' },
  pendingItem: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' },
  pendingItemActive: { borderColor: '#3182ce', backgroundColor: '#ebf8ff' },
  detailCol: { display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' },
  detailHeader: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: '#4a5568' },
  uploadBtn: { padding: '10px 20px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
};

export default ExpenseApproval;
