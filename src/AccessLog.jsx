import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function AccessLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(100);

    if (data) setLogs(data);
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔐 시스템 접속 보안 로그</h1>
        <button onClick={fetchLogs} style={styles.refreshBtn}>로그 새로고침</button>
      </div>

      <div style={styles.card}>
        <p style={styles.subTitle}>※ 최근 100건의 접속 IP 및 계정 정보가 기록됩니다.</p>
        <div style={styles.scrollWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>접속 시간 (KST)</th>
                <th style={styles.th}>사용자 계정</th>
                <th style={styles.th}>접속 IP 주소</th>
                <th style={styles.th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(log.logged_at).toLocaleString('ko-KR')}</td>
                  <td style={{...styles.td, fontWeight:'bold'}}>{log.email}</td>
                  <td style={{...styles.td, color:'#3182ce'}}>{log.ip_address}</td>
                  <td style={styles.td}><span style={styles.successBadge}>접속성공</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px', backgroundColor: '#f7fafc', minHeight: '100vh' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' },
  title: { margin:0, fontSize:'32px', fontWeight:'900', color:'#1a365d' },
  refreshBtn: { padding:'12px 25px', backgroundColor:'#3182ce', color:'white', border:'none', borderRadius:'10px', fontSize:'18px', cursor:'pointer' },
  card: { backgroundColor:'white', padding:'30px', borderRadius:'20px', boxShadow:'0 10px 15px rgba(0,0,0,0.05)' },
  subTitle: { color:'#718096', fontSize:'18px', marginBottom:'20px' },
  scrollWrapper: { maxHeight:'650px', overflowY:'auto', border:'1px solid #edf2f7', borderRadius:'12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '18px', textAlign:'center' },
  thead: { position: 'sticky', top: 0, backgroundColor: '#f7fafc', zIndex: 10 },
  th: { padding: '20px', borderBottom: '2px solid #e2e8f0' },
  td: { padding: '20px' },
  successBadge: { padding: '6px 12px', backgroundColor: '#f0fff4', color: '#2f855a', borderRadius: '8px', fontSize: '14px', border: '1px solid #c6f6d5' }
};

export default AccessLog;