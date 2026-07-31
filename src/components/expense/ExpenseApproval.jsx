// src/components/expense/ExpenseApproval.jsx
// 결재완료 처리: 결재대기 상태인 지출결의서를 여러 건 골라 한 번에 결재완료로 전환합니다.
// 결재 스캔 파일은 선택사항입니다 — 있으면 단건 처리 시에만 함께 첨부할 수 있고, 없어도 결재완료
// 처리가 됩니다(종이 결재 등 스캔본이 없는 경우를 위함).
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const BUCKET = 'expense-scans';

function ExpenseApproval({ requestId, onDone }) {
  const [pending, setPending] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => (requestId ? [requestId] : []));
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPending(); }, []);
  useEffect(() => { if (requestId) setSelectedIds([requestId]); }, [requestId]);

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

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const selectAll = () => setSelectedIds(pending.map((r) => r.id));
  const clearSelection = () => setSelectedIds([]);

  const selectedRows = pending.filter((r) => selectedIds.includes(r.id));
  const selectedTotal = selectedRows.reduce((a, c) => a + Number(c.total_amount || 0), 0);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.size > 15 * 1024 * 1024) {
      alert('파일 용량은 15MB 이하로 올려주세요.');
      e.target.value = '';
      return;
    }
    setFile(f || null);
  };

  const handleApprove = async () => {
    if (selectedIds.length === 0) { alert('결재완료 처리할 건을 선택해주세요.'); return; }

    setUploading(true);
    try {
      const updatePayload = {
        status: '결재완료',
        approved_at: new Date().toISOString(),
      };

      // 첨부파일은 선택사항입니다. 파일 하나를 여러 건에 붙이는 건 의미가 없으므로,
      // 단건을 선택했을 때만 첨부를 함께 저장합니다.
      if (file && selectedIds.length === 1) {
        const safeName = file.name.replace(/[^\w.\-가-힣]/g, '_');
        const filePath = `requests/${selectedIds[0]}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, { upsert: false });
        if (uploadError) throw uploadError;
        updatePayload.approved_file_path = filePath;
        updatePayload.approved_file_name = file.name;
      }

      const { error: updateError } = await supabase
        .from('expense_requests')
        .update(updatePayload)
        .in('id', selectedIds);
      if (updateError) throw updateError;

      alert(`${selectedIds.length}건 결재완료 처리되었습니다.`);
      setFile(null);
      setSelectedIds([]);
      fetchPending();
      if (onDone) onDone();
    } catch (err) {
      alert('처리 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p style={styles.emptyText}>불러오는 중...</p>;

  return (
    <div>
      <h2 style={styles.title}>결재완료 처리</h2>
      <p style={styles.subtitle}>이사·실장·사장 결재가 모두 끝난 지출결의서를 체크해서 한 번에 결재완료 처리하세요. 스캔 파일은 없어도 됩니다.</p>

      <div style={styles.layout}>
        <div style={styles.listCol}>
          {pending.length > 0 && (
            <div style={styles.selectAllRow}>
              <button onClick={selectAll} style={styles.selectAllBtn}>전체 선택</button>
              <button onClick={clearSelection} style={styles.selectAllBtn}>선택 해제</button>
            </div>
          )}
          {pending.length === 0 ? (
            <p style={styles.emptyText}>결재대기 중인 건이 없습니다.</p>
          ) : (
            pending.map((r) => (
              <label
                key={r.id}
                style={{ ...styles.pendingItem, ...(selectedIds.includes(r.id) ? styles.pendingItemActive : {}) }}
              >
                <div style={styles.pendingRow}>
                  <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                  <div>
                    <div style={styles.pendingDate}>{r.request_date}</div>
                    <div style={styles.pendingAccount}>
                      {r.company_bank_accounts ? `${r.company_bank_accounts.bank_name} ${r.company_bank_accounts.account_no}` : '-'}
                    </div>
                    <div style={styles.pendingAmount}>{Number(r.total_amount || 0).toLocaleString()}원</div>
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <div style={styles.detailCol}>
          {selectedIds.length > 0 ? (
            <>
              <div style={styles.detailHeader}>
                <div style={styles.detailMain}>{selectedIds.length}건 선택됨</div>
                <div style={styles.detailAmount}>합계 {selectedTotal.toLocaleString()}원</div>
              </div>
              {selectedIds.length === 1 ? (
                <>
                  <label style={styles.label}>결재 스캔 파일 (이미지 또는 PDF, 선택사항)</label>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileChange} style={styles.fileInput} />
                </>
              ) : (
                <p style={{ ...styles.hint }}>여러 건을 한 번에 처리할 때는 스캔 파일 첨부 없이 진행됩니다.</p>
              )}
              <button onClick={handleApprove} disabled={uploading} style={styles.uploadBtn}>
                {uploading ? '처리 중...' : `결재완료 처리 (${selectedIds.length}건)`}
              </button>
            </>
          ) : (
            <p style={styles.emptyText}>왼쪽에서 처리할 건을 선택해주세요. (여러 건 선택 가능)</p>
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
  selectAllRow: { display: 'flex', gap: '8px', marginBottom: '4px' },
  selectAllBtn: { padding: '8px 14px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
  pendingItem: { padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'block' },
  pendingItemActive: { borderColor: '#3182ce', borderWidth: '2px', backgroundColor: '#ebf8ff' },
  pendingRow: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  pendingDate: { fontWeight: 700, fontSize: '18px' },
  pendingAccount: { fontSize: '15px', color: '#718096', marginTop: '3px' },
  pendingAmount: { fontSize: '17px', marginTop: '5px', fontWeight: 700 },
  detailCol: { display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' },
  detailHeader: { display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '7px' },
  detailMain: { fontSize: '19px', fontWeight: 700 },
  detailAmount: { fontSize: '17px', color: '#4a5568' },
  label: { fontSize: '17px', fontWeight: 700, color: '#4a5568' },
  hint: { fontSize: '15px', color: '#a0aec0' },
  fileInput: { fontSize: '17px' },
  uploadBtn: { padding: '15px 26px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '11px', cursor: 'pointer', fontWeight: 700, fontSize: '17px' },
};

export default ExpenseApproval;
