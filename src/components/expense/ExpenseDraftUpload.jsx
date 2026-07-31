// src/components/expense/ExpenseDraftUpload.jsx
// 미지급금(결제건) 표 이미지, 엑셀 또는 텍스트를 업로드하면 지출결의서 초안을 자동 생성합니다.
// 이미지는 expense-doc-ocr Edge Function(Claude Vision)으로, 엑셀/텍스트는 브라우저에서
// 직접 파싱합니다(엑셀은 xlsx 라이브러리, txt는 탭/콤마/공백 구분자를 자동 인식).
// 추출 결과는 편집 가능한 표로 보여준 뒤, 한 번에 등록한 표는 항상 지출결의서 1건
// (expense_requests 1행 + 항목 N개)으로 작성중 상태로 저장됩니다. 저장 후에는 작성
// 화면으로 이동해 계정과목 등을 마저 확인·완료합니다.
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';

const ACCOUNT_CATEGORIES = ['급여', '4대보험', '대출이자', '카드대금', '위탁대행/기타', '퇴직연금', '통신비', '수도광열비', '원자재매입', '설비 도입', '기타'];

const emptyItem = () => ({
  account_category: '', vendor_name: '', item_name: '', amount: '',
  bank_name: '', account_no: '', account_holder: '', passbook_memo: '', note: '',
});

// 엑셀 헤더에서 흔히 쓰이는 컬럼명을 표준 필드로 매핑
const HEADER_MAP = [
  { keys: ['지급', '적요', '내역', '거래처', '항목'], field: 'vendor_name' },
  { keys: ['예금주', '계좌명의', '수취인'], field: 'account_holder' },
  { keys: ['은행'], field: 'bank_name' },
  { keys: ['계좌번호', '계좌'], field: 'account_no' },
  { keys: ['금액', '지급액', '결제액'], field: 'amount' },
];

// 표 형태로 파싱된 행(배열의 배열)에서 헤더 행을 찾아 지출 항목 배열로 변환합니다.
// 엑셀(xlsx/xls/csv)과 txt 파일 파싱이 이 로직을 공유합니다.
function rowsToItems(rows) {
  // 헤더 행 찾기 (지급/예금주/은행/계좌/금액 관련 키워드가 2개 이상 매칭되는 첫 행)
  let headerRowIdx = -1;
  let colMap = {};
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r].map((c) => String(c || '').replace(/\s/g, ''));
    const map = {};
    let hits = 0;
    row.forEach((cell, ci) => {
      for (const h of HEADER_MAP) {
        if (h.keys.some((k) => cell.includes(k))) { map[ci] = h.field; hits++; break; }
      }
    });
    if (hits >= 2) { headerRowIdx = r; colMap = map; break; }
  }

  if (headerRowIdx === -1) {
    return { items: [], warning: '표 헤더(지급/예금주/은행/계좌/금액)를 찾지 못했습니다. 직접 입력해주세요.' };
  }

  // "합   계", "총 합계" 처럼 셀 안에 공백이 섞여 들어오는 합계 행을 안정적으로 걸러내기 위해
  // 공백을 모두 제거한 값을 기준으로 판정합니다 (엑셀에서 병합 셀을 복사하면 흔히 발생).
  const isTotalLabel = (s) => /^(합계|소계|누계|총계|total|sum)$/i.test(String(s || '').replace(/\s/g, ''));

  const items = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const isEmpty = row.every((c) => String(c || '').trim() === '');
    if (isEmpty) continue;
    if (row.some((c) => isTotalLabel(c))) continue; // 합계/총계 행 전체를 건너뜀

    const item = emptyItem();
    let hasData = false;
    Object.entries(colMap).forEach(([ci, field]) => {
      let val = row[Number(ci)];
      if (val === undefined || val === null) return;
      if (field === 'amount') {
        const num = Number(String(val).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num) && num !== 0) { item.amount = num; hasData = true; }
      } else {
        const s = String(val).trim();
        if (s) { item[field] = s; hasData = true; }
      }
    });
    if (hasData && item.vendor_name) {
      items.push(item);
    }
  }
  return { items, warning: items.length === 0 ? '추출된 항목이 없습니다. 파일 형식을 확인해주세요.' : null };
}

function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(rowsToItems(rows));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 외부에서 복사해 붙여넣은 표(엑셀/구글시트에서 복사하면 탭으로 구분됨) 또는
// 콤마/여러 칸 공백으로 구분된 표 형식 텍스트를 파싱합니다. .txt 파일 업로드와
// 텍스트 붙여넣기(Ctrl+V) 두 경로 모두 이 함수를 공유합니다.
function parseTableText(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/).filter((line) => line.trim() !== '');
  const rows = lines.map((line) => {
    if (line.includes('\t')) return line.split('\t');
    if (line.includes(',')) return line.split(',');
    return line.split(/\s{2,}/);
  });
  return rowsToItems(rows);
}

function parseTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(parseTableText(String(e.target.result || '')));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ExpenseDraftUpload({ onDraftSaved }) {
  const [accounts, setAccounts] = useState([]);
  const [header, setHeader] = useState({
    request_date: new Date().toISOString().split('T')[0],
    requester: '',
    bank_account_id: '',
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    supabase.from('company_bank_accounts').select('*').eq('is_active', true).order('id').then(({ data }) => setAccounts(data || []));
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email;
      if (email) setHeader((h) => ({ ...h, requester: email.split('@')[0] }));
    });
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setWarning('');
    setItems([]);
    setLoading(true);
    try {
      const isExcel = /\.(xlsx|xls|csv)$/i.test(file.name);
      const isText = /\.txt$/i.test(file.name);
      const isImage = file.type.startsWith('image/');

      if (isExcel) {
        const { items: parsed, warning: w } = await parseExcelFile(file);
        setItems(parsed.length > 0 ? parsed : [emptyItem()]);
        if (w) setWarning(w);
      } else if (isText) {
        const { items: parsed, warning: w } = await parseTextFile(file);
        setItems(parsed.length > 0 ? parsed : [emptyItem()]);
        if (w) setWarning(w);
      } else if (isImage) {
        const base64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke('expense-doc-ocr', {
          body: { imageBase64: base64, mediaType: file.type },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'OCR 처리에 실패했습니다.');

        const extracted = data.extracted || {};
        if (extracted.request_date) {
          setHeader((h) => ({ ...h, request_date: extracted.request_date }));
        }
        const parsedItems = (extracted.items || []).map((it) => ({
          account_category: ACCOUNT_CATEGORIES.includes(it.account_category_guess) ? it.account_category_guess : '기타',
          vendor_name: it.vendor_name || '',
          item_name: '',
          amount: it.amount != null ? Number(String(it.amount).replace(/[^0-9.-]/g, '')) : '',
          bank_name: it.bank_name || '',
          account_no: it.account_no || '',
          account_holder: it.account_holder || '',
          passbook_memo: '',
          note: '',
        }));
        setItems(parsedItems.length > 0 ? parsedItems : [emptyItem()]);
        if (parsedItems.length === 0) setWarning('이미지에서 항목을 추출하지 못했습니다. 표가 잘 보이는 이미지인지 확인해주세요.');
      } else {
        setWarning('이미지(PNG/JPG), 엑셀(XLSX/XLS/CSV) 또는 텍스트(TXT) 파일만 지원합니다.');
        setItems([emptyItem()]);
      }
    } catch (err) {
      setWarning('추출 실패: ' + (err.message || String(err)));
      setItems([emptyItem()]);
    } finally {
      setLoading(false);
    }
  };

  // 엑셀/구글시트에서 표를 복사(Ctrl+C)해서 아래 붙여넣기 칸에 그대로 붙여넣으면(Ctrl+V),
  // 파일 저장 없이 바로 같은 파서로 인식합니다.
  const handleAnalyzePaste = () => {
    if (!pasteText.trim()) { alert('먼저 엑셀에서 표를 복사해 붙여넣어주세요.'); return; }
    setWarning('');
    setFileName('');
    const { items: parsed, warning: w } = parseTableText(pasteText);
    setItems(parsed.length > 0 ? parsed : [emptyItem()]);
    if (w) setWarning(w);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const filledItems = () => items.filter((it) => it.vendor_name || it.item_name || it.amount);

  const buildItemRow = (it, idx, requestId) => ({
    request_id: requestId,
    line_no: idx + 1,
    account_category: it.account_category || null,
    vendor_name: it.vendor_name || null,
    item_name: it.item_name || null,
    amount: Number(it.amount) || 0,
    payment_method: '계좌이체',
    bank_name: it.bank_name || null,
    account_no: it.account_no || null,
    account_holder: it.account_holder || null,
    passbook_memo: it.passbook_memo || null,
    note: it.note || null,
  });

  // 한 번에 등록(업로드/붙여넣기)한 표는 항상 지출결의서 1건으로 정리해서 저장합니다
  // (결재건 1개 = expense_requests 1행 + 항목 N개). 여러 건으로 쪼개 올린 게 아니라
  // 한 번에 등록한 결제 목록이므로, 결재도 한 건으로 올라가는 게 맞습니다.
  const saveDraft = async () => {
    if (!header.bank_account_id) { alert('출금계좌를 선택해주세요.'); return; }
    const valid = filledItems();
    if (valid.length === 0) { alert('최소 1개 항목이 필요합니다.'); return; }
    setSaving(true);
    try {
      const payload = {
        request_date: header.request_date,
        requester: header.requester,
        bank_account_id: header.bank_account_id,
        total_amount: total,
        status: '작성중',
      };
      const { data, error } = await supabase.from('expense_requests').insert(payload).select('id').single();
      if (error) throw error;
      const id = data.id;

      const itemRows = valid.map((it, idx) => buildItemRow(it, idx, id));
      const { error: itemError } = await supabase.from('expense_request_items').insert(itemRows);
      if (itemError) throw itemError;

      alert(`${valid.length}개 항목이 지출결의서 1건으로 저장되었습니다.`);
      setItems([]);
      setFileName('');
      setPasteText('');
      onDraftSaved(id);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={styles.title}>이미지 · 엑셀로 초안 만들기</h2>
      <p style={styles.desc}>미지급금(결제건) 표가 담긴 이미지(사진/스캔), 엑셀·텍스트 파일을 올리거나, 엑셀에서 표를 복사해 바로 붙여넣으면 항목을 읽어 지출결의서 초안을 만들어드립니다.</p>

      <div style={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.xlsx,.xls,.csv,.txt"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <div style={styles.uploadIcon}>📄</div>
        <div style={styles.uploadText}>{fileName || '클릭하여 이미지, 엑셀 또는 텍스트 파일 선택'}</div>
        <div style={styles.uploadHint}>PNG / JPG / XLSX / XLS / CSV / TXT</div>
      </div>

      <div style={styles.dividerRow}>
        <span style={styles.dividerLine} />
        <span style={styles.dividerText}>또는</span>
        <span style={styles.dividerLine} />
      </div>

      <div style={styles.pasteBox}>
        <div style={styles.pasteLabel}>엑셀에서 표를 복사(Ctrl+C)해서 아래에 붙여넣기(Ctrl+V)</div>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={'NO\t지급\t예금주\t은행\t계좌번호\t금액\n1\t원푸드식당\t최윤애\t신한은행\t110-312-4321-06\t1,501,500 ...'}
          style={styles.pasteArea}
        />
        <div style={styles.pasteActions}>
          <button onClick={handleAnalyzePaste} style={styles.pasteBtn}>붙여넣은 표 분석하기</button>
        </div>
      </div>

      {loading && <p style={styles.loadingText}>AI가 표를 읽는 중입니다...</p>}
      {warning && <p style={styles.warnBanner}>{warning}</p>}

      {items.length > 0 && (
        <>
          <div style={styles.headerGrid}>
            <div style={styles.field}>
              <label style={styles.label}>기안일자</label>
              <input type="date" value={header.request_date} onChange={(e) => setHeader((h) => ({ ...h, request_date: e.target.value }))} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>작성자</label>
              <input type="text" value={header.requester} onChange={(e) => setHeader((h) => ({ ...h, requester: e.target.value }))} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>출금계좌 *</label>
              <select value={header.bank_account_id} onChange={(e) => setHeader((h) => ({ ...h, bank_account_id: e.target.value }))} style={styles.input}>
                <option value="">선택하세요</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.bank_name} {a.account_no} {a.purpose ? `(${a.purpose})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.saveModeBox}>
            <span style={styles.saveModeLabel}>이 표는 지출결의서 1건으로 저장됩니다</span>
            <span style={styles.saveModeHint}>— 항목 {items.length}개 · 결재 1건</span>
          </div>

          <div style={styles.itemsHeader}>
            <h3 style={styles.subtitle}>추출된 항목 — 내용을 확인하고 필요하면 수정하세요</h3>
            <button onClick={addItem} style={styles.addBtn}>+ 항목 추가</button>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={{ ...styles.th, width: '48px' }}>NO</th>
                  <th style={{ ...styles.th, width: '150px' }}>계정과목</th>
                  <th style={styles.th}>거래처</th>
                  <th style={{ ...styles.th, width: '140px' }}>금액</th>
                  <th style={styles.th}>입금은행</th>
                  <th style={styles.th}>계좌번호</th>
                  <th style={styles.th}>예금주</th>
                  <th style={{ ...styles.th, width: '44px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#a0aec0' }}>{idx + 1}</td>
                    <td style={styles.td}>
                      <select value={it.account_category} onChange={(e) => updateItem(idx, 'account_category', e.target.value)} style={styles.cellInput}>
                        <option value="">선택</option>
                        {ACCOUNT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={styles.td}><input value={it.vendor_name} onChange={(e) => updateItem(idx, 'vendor_name', e.target.value)} style={styles.cellInput} placeholder="거래처명" /></td>
                    <td style={styles.td}><input type="number" value={it.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} style={styles.cellInput} placeholder="0" /></td>
                    <td style={styles.td}><input value={it.bank_name} onChange={(e) => updateItem(idx, 'bank_name', e.target.value)} style={styles.cellInput} placeholder="은행" /></td>
                    <td style={styles.td}><input value={it.account_no} onChange={(e) => updateItem(idx, 'account_no', e.target.value)} style={styles.cellInput} placeholder="계좌번호" /></td>
                    <td style={styles.td}><input value={it.account_holder} onChange={(e) => updateItem(idx, 'account_holder', e.target.value)} style={styles.cellInput} placeholder="예금주" /></td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button onClick={() => removeItem(idx)} style={styles.removeBtn}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.totalRow}>
            <span>합계</span>
            <strong>{total.toLocaleString()}원</strong>
          </div>

          <div style={styles.actions}>
            <button onClick={saveDraft} style={styles.saveBtn} disabled={saving}>{saving ? '저장 중...' : '지출결의서 1건으로 저장하기'}</button>
          </div>
          <p style={styles.footNote}>저장 후 작성 화면으로 이동해 계정과목 등을 확인·완료할 수 있습니다.</p>
        </>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 10px 0', fontSize: '32px', fontWeight: 800, color: '#1a365d' },
  desc: { margin: '0 0 26px 0', fontSize: '18px', color: '#718096', lineHeight: 1.6 },
  uploadBox: { border: '2px dashed #cbd5e0', borderRadius: '16px', padding: '48px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#f7fafc', marginBottom: '20px' },
  uploadIcon: { fontSize: '40px', marginBottom: '10px' },
  uploadText: { fontSize: '19px', fontWeight: 700, color: '#2d3748', marginBottom: '6px' },
  uploadHint: { fontSize: '15px', color: '#a0aec0' },
  dividerRow: { display: 'flex', alignItems: 'center', gap: '14px', margin: '18px 0' },
  dividerLine: { flex: 1, height: '1px', backgroundColor: '#e2e8f0' },
  dividerText: { color: '#a0aec0', fontSize: '15px', fontWeight: 700 },
  pasteBox: { border: '1px solid #dfe4ea', borderRadius: '16px', padding: '20px 22px', backgroundColor: '#fbfcfe', marginBottom: '20px' },
  pasteLabel: { fontSize: '16px', fontWeight: 700, color: '#4a5568', marginBottom: '10px' },
  pasteArea: { width: '100%', minHeight: '120px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'vertical' },
  pasteActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '10px' },
  pasteBtn: { padding: '11px 20px', backgroundColor: '#ebf4ff', color: '#2b6cb0', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 700 },
  loadingText: { color: '#3182ce', fontSize: '18px', fontWeight: 700 },
  warnBanner: { color: '#9b2c2c', backgroundColor: '#fde2e2', padding: '14px 18px', borderRadius: '10px', fontSize: '16px' },
  headerGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '22px', marginTop: '10px', marginBottom: '32px' },
  field: { display: 'flex', flexDirection: 'column', gap: '9px' },
  label: { fontSize: '18px', fontWeight: 700, color: '#4a5568' },
  input: { padding: '14px 16px', borderRadius: '10px', border: '1px solid #dfe4ea', fontSize: '19px', backgroundColor: '#fbfcfe' },
  saveModeBox: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 22px', padding: '16px 20px', backgroundColor: '#f7fafc', borderRadius: '12px', marginBottom: '20px' },
  saveModeLabel: { fontSize: '17px', fontWeight: 700, color: '#2d3748' },
  saveModeHint: { fontWeight: 400, color: '#a0aec0', fontSize: '14px' },
  itemsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', marginBottom: '18px' },
  subtitle: { margin: 0, fontSize: '22px', fontWeight: 700, color: '#2d3748' },
  addBtn: { padding: '12px 22px', backgroundColor: '#ebf4ff', color: '#2b6cb0', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', fontWeight: 700 },
  tableWrapper: { overflowX: 'auto', borderRadius: '14px', border: '1px solid #edf1f5' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '18px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  th: { padding: '16px 14px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', whiteSpace: 'nowrap', fontSize: '17px', fontWeight: 700 },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '12px 12px' },
  cellInput: { width: '100%', padding: '13px 14px', borderRadius: '9px', border: '1px solid #e2e8f0', fontSize: '18px', boxSizing: 'border-box' },
  removeBtn: { border: 'none', backgroundColor: '#fde2e2', color: '#9b2c2c', borderRadius: '9px', width: '36px', height: '36px', cursor: 'pointer', fontWeight: 'bold', fontSize: '19px' },
  totalRow: { display: 'flex', justifyContent: 'flex-end', gap: '20px', alignItems: 'baseline', marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #2d3748', fontSize: '24px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' },
  saveBtn: { padding: '16px 30px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '18px', boxShadow: '0 4px 10px rgba(49,130,206,0.35)' },
  footNote: { textAlign: 'right', color: '#718096', fontSize: '15px', marginTop: '10px' },
};

export default ExpenseDraftUpload;
