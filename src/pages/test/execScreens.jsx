// src/pages/test/execScreens.jsx
// 경영(EXEC) 화면 6종: 통합 대시보드 / 일간·주간·월간 리포트 상세 / 일일 실적 알림 미리보기 / 리포트 구독 설정
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { COLORS, box, pill, fmtWon, fmtNum } from './theme';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ---------- 01 통합 대시보드 ----------
export function ExecDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const today = todayStr();
    const [{ data: sales }, { data: expenses }, { data: receivables }, { count: pendingOrders }, { count: doneOrders }, { count: pendingExpense }, { data: syncLogs }] = await Promise.all([
      supabase.from('sales_records').select('total_price').eq('work_date', today),
      supabase.from('daily_ledger').select('amount').eq('trans_date', today).eq('type', '지출'),
      supabase.from('receivables').select('amount'),
      supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', ['대기', '진행중']),
      supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', '완료'),
      supabase.from('expense_requests').select('id', { count: 'exact', head: true }).eq('status', '결재대기'),
      supabase.from('greenp_sync_logs').select('synced_at').order('synced_at', { ascending: false }).limit(1),
    ]);
    const totalSales = (sales || []).reduce((s, r) => s + Number(r.total_price || 0), 0);
    const totalExpense = (expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalReceivable = (receivables || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    setData({
      totalSales, totalExpense, netProfit: totalSales - totalExpense, totalReceivable,
      pendingOrders: pendingOrders || 0, doneOrders: doneOrders || 0, pendingExpense: pendingExpense || 0,
      lastSync: syncLogs && syncLogs[0] ? new Date(syncLogs[0].synced_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-',
    });
  };

  if (!data) return <p style={box.loadingText}>불러오는 중...</p>;

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>통합 대시보드</h2>
        <p style={box.hint}>{todayStr()} · 마지막 동기화 {data.lastSync}</p>
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>금일 매출</span><span style={box.statValue}>{fmtWon(data.totalSales)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>금일 비용</span><span style={{ ...box.statValue, color: COLORS.red }}>{fmtWon(data.totalExpense)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>순이익</span><span style={{ ...box.statValue, color: COLORS.green }}>{fmtWon(data.netProfit)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>미수금 총액</span><span style={{ ...box.statValue, color: COLORS.blue }}>{fmtWon(data.totalReceivable)}</span></div>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>팀별 진행 현황</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span style={pill(COLORS.greenBg, COLORS.green)}>영업/현장 · 작업지시 {data.pendingOrders}건 진행중</span>
          <span style={pill(COLORS.blueBg, COLORS.blue)}>생산 · 완료 전표 {data.doneOrders}건</span>
          <span style={pill(COLORS.amberBg, COLORS.amber)}>경리 · 결재대기 {data.pendingExpense}건</span>
        </div>
      </div>
    </div>
  );
}

// ---------- 02 일간 리포트 상세 ----------
export function ExecDailyReport() {
  const [rows, setRows] = useState(null);
  const [byType, setByType] = useState([]);
  const [byCustomer, setByCustomer] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const today = todayStr();
    const yesterday = daysAgoStr(1);
    const [{ data: todaySales }, { data: ySales }, { data: todayExpense }] = await Promise.all([
      supabase.from('sales_records').select('total_price, work_type, customer_name').eq('work_date', today),
      supabase.from('sales_records').select('total_price').eq('work_date', yesterday),
      supabase.from('daily_ledger').select('amount').eq('trans_date', today).eq('type', '지출'),
    ]);
    const totalToday = (todaySales || []).reduce((s, r) => s + Number(r.total_price || 0), 0);
    const totalYesterday = (ySales || []).reduce((s, r) => s + Number(r.total_price || 0), 0);
    const totalExpense = (todayExpense || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const change = totalYesterday > 0 ? (((totalToday - totalYesterday) / totalYesterday) * 100).toFixed(1) : null;

    const typeMap = {};
    (todaySales || []).forEach((r) => { typeMap[r.work_type || '기타'] = (typeMap[r.work_type || '기타'] || 0) + Number(r.total_price || 0); });
    const custMap = {};
    (todaySales || []).forEach((r) => { const c = r.customer_name || '미상'; custMap[c] = (custMap[c] || 0) + Number(r.total_price || 0); });

    setSummary({ totalToday, totalExpense, net: totalToday - totalExpense, change });
    setByType(Object.entries(typeMap).sort((a, b) => b[1] - a[1]));
    setByCustomer(Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 3));
    setRows(todaySales || []);
  };

  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;
  const maxType = Math.max(1, ...byType.map((t) => t[1]));

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>일간 리포트 (상세)</h2>
        <p style={box.hint}>{todayStr()} · 매일 아침 자동 생성 예정 (현재는 조회 시점 실시간 집계)</p>
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>금일 매출</span><span style={box.statValue}>{fmtWon(summary.totalToday)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>금일 비용</span><span style={{ ...box.statValue, color: COLORS.red }}>{fmtWon(summary.totalExpense)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>순이익</span><span style={{ ...box.statValue, color: COLORS.green }}>{fmtWon(summary.net)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>전일 대비</span><span style={{ ...box.statValue, color: summary.change > 0 ? COLORS.green : COLORS.red }}>{summary.change !== null ? `${summary.change > 0 ? '+' : ''}${summary.change}%` : '데이터 없음'}</span></div>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>오늘 작업구분별 매출</h3>
        {byType.length === 0 && <p style={box.emptyText}>금일 등록된 작업 실적이 없습니다.</p>}
        {byType.map(([type, v]) => (
          <div key={type} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: COLORS.steel, marginBottom: '4px' }}>
              <span>{type}</span><span>{fmtWon(v)}</span>
            </div>
            <div style={{ background: '#edf2f7', borderRadius: '999px', height: '10px' }}>
              <div style={{ width: `${(v / maxType) * 100}%`, background: COLORS.blue, height: '10px', borderRadius: '999px' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>거래처별 매출 TOP3 (오늘)</h3>
        {byCustomer.length === 0 && <p style={box.emptyText}>금일 등록된 거래가 없습니다.</p>}
        {byCustomer.map(([c, v]) => (
          <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: '16px' }}>
            <span>{c}</span><span style={{ fontWeight: 700 }}>{fmtWon(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- 03 일일 실적 알림 미리보기 (모바일) ----------
export function ExecDailyAlert() {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    (async () => {
      const today = todayStr();
      const [{ data: sales }, { data: expenses }] = await Promise.all([
        supabase.from('sales_records').select('total_price').eq('work_date', today),
        supabase.from('daily_ledger').select('amount').eq('trans_date', today).eq('type', '지출'),
      ]);
      const totalSales = (sales || []).reduce((s, r) => s + Number(r.total_price || 0), 0);
      const totalExpense = (expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      setSummary({ totalSales, totalExpense, net: totalSales - totalExpense });
    })();
  }, []);

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>일일 실적 알림 (모바일 미리보기)</h2>
        <p style={box.hint}>대표님 카카오 알림톡으로 매일 17:35 자동 발송될 메시지 미리보기입니다. (자동 발송 스케줄러는 별도 배포 필요)</p>
      </div>
      <div style={{ width: '340px', border: `2px solid ${COLORS.navy}`, borderRadius: '22px', overflow: 'hidden' }}>
        <div style={{ background: COLORS.navy, color: 'white', padding: '14px 18px', fontWeight: 700 }}>오성철강 스마트ERP</div>
        {!summary ? <p style={{ ...box.loadingText, padding: '18px' }}>불러오는 중...</p> : (
          <div style={{ padding: '18px', background: COLORS.blueBg }}>
            <p style={{ fontSize: '13px', color: COLORS.steel, margin: '0 0 8px 0' }}>17:35</p>
            <p style={{ fontSize: '16px', color: '#2d3748', lineHeight: 1.6, margin: 0 }}>
              오늘 실적 요약을 보내드려요.<br />
              매출 {fmtWon(summary.totalSales)} · 비용 {fmtWon(summary.totalExpense)}<br />
              순이익 {fmtWon(summary.net)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- 04 주간 리포트 상세 ----------
export function ExecWeeklyReport() {
  const [days, setDays] = useState([]);
  const [byType, setByType] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const from = daysAgoStr(6);
      const to = todayStr();
      const { data } = await supabase.from('sales_records').select('total_price, work_date, work_type').gte('work_date', from).lte('work_date', to);
      const byDay = {};
      const byT = {};
      (data || []).forEach((r) => {
        byDay[r.work_date] = (byDay[r.work_date] || 0) + Number(r.total_price || 0);
        byT[r.work_type || '기타'] = (byT[r.work_type || '기타'] || 0) + Number(r.total_price || 0);
      });
      const dayList = [];
      for (let i = 6; i >= 0; i--) {
        const d = daysAgoStr(i);
        dayList.push({ date: d, value: byDay[d] || 0 });
      }
      setDays(dayList);
      setByType(Object.entries(byT).sort((a, b) => b[1] - a[1]));
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={box.loadingText}>불러오는 중...</p>;
  const total = days.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...days.map((d) => d.value));

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>주간 리포트 (상세)</h2>
        <p style={box.hint}>{days[0]?.date} ~ {days[6]?.date}</p>
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>주간 누계매출</span><span style={box.statValue}>{fmtWon(total)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>일평균 매출</span><span style={box.statValue}>{fmtWon(total / 7)}</span></div>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>일자별 매출</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '160px' }}>
          {days.map((d) => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <span style={{ fontSize: '12px', color: COLORS.steel, marginBottom: '4px' }}>{d.value > 0 ? fmtNum(Math.round(d.value / 1000)) + 'K' : ''}</span>
              <div style={{ width: '70%', height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '4px' : 0, background: COLORS.blue, borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: '12px', color: COLORS.steel, marginTop: '6px' }}>{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>작업구분별 실적 순위 (이번주)</h3>
        {byType.length === 0 && <p style={box.emptyText}>실적이 없습니다.</p>}
        <table style={box.table}>
          <thead><tr><th style={box.th}>작업구분</th><th style={box.th}>매출</th></tr></thead>
          <tbody>{byType.map(([t, v]) => <tr key={t}><td style={box.td}>{t}</td><td style={box.td}>{fmtWon(v)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 05 월간 리포트 상세 ----------
export function ExecMonthlyReport() {
  const [months, setMonths] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
      const { data } = await supabase.from('sales_records').select('total_price, work_date, customer_name').gte('work_date', from);
      const byMonth = {};
      const byCust = {};
      const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      (data || []).forEach((r) => {
        const key = r.work_date.slice(0, 7);
        byMonth[key] = (byMonth[key] || 0) + Number(r.total_price || 0);
        if (key === curMonthKey) byCust[r.customer_name || '미상'] = (byCust[r.customer_name || '미상'] || 0) + Number(r.total_price || 0);
      });
      const monthList = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthList.push({ month: `${d.getMonth() + 1}월`, value: byMonth[key] || 0 });
      }
      setMonths(monthList);
      const custList = Object.entries(byCust).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const curTotal = custList.reduce((s, [, v]) => s + v, 0) + Object.entries(byCust).slice(5).reduce((s, [, v]) => s + v, 0);
      setTopCustomers(custList.map(([name, v]) => ({ name, v, pct: curTotal > 0 ? ((v / curTotal) * 100).toFixed(0) : 0 })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={box.loadingText}>불러오는 중...</p>;
  const max = Math.max(1, ...months.map((m) => m.value));
  const thisMonth = months[months.length - 1]?.value || 0;
  const lastMonth = months[months.length - 2]?.value || 0;
  const change = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : null;

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>월간 리포트 (상세)</h2>
        <p style={box.hint}>{new Date().getFullYear()}년 {new Date().getMonth() + 1}월</p>
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>월 누계매출</span><span style={box.statValue}>{fmtWon(thisMonth)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>전월 대비</span><span style={{ ...box.statValue, color: change > 0 ? COLORS.green : COLORS.red }}>{change !== null ? `${change > 0 ? '+' : ''}${change}%` : '데이터 없음'}</span></div>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>6개월 매출 추이</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '160px' }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <span style={{ fontSize: '12px', color: COLORS.steel, marginBottom: '4px' }}>{m.value > 0 ? fmtNum(Math.round(m.value / 10000)) + '만' : ''}</span>
              <div style={{ width: '70%', height: `${(m.value / max) * 100}%`, minHeight: m.value > 0 ? '4px' : 0, background: i === months.length - 1 ? COLORS.blue : '#a0aec0', borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: '13px', color: COLORS.steel, marginTop: '6px' }}>{m.month}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>거래처 매출 순위 TOP5 (이번달)</h3>
        {topCustomers.length === 0 && <p style={box.emptyText}>이번달 실적이 없습니다.</p>}
        <table style={box.table}>
          <thead><tr><th style={box.th}>거래처</th><th style={box.th}>매출액</th><th style={box.th}>비중</th></tr></thead>
          <tbody>{topCustomers.map((c) => <tr key={c.name}><td style={box.td}>{c.name}</td><td style={box.td}>{fmtWon(c.v)}</td><td style={box.td}>{c.pct}%</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 06 리포트 구독 설정 ----------
export function ExecReportSubscriptions() {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ recipient_name: '', report_types: '일간', channel: '카카오톡', send_time: '17:35' });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('report_subscriptions').select('*').order('id');
    setRows(data || []);
  };

  const add = async () => {
    if (!form.recipient_name) { alert('수신자를 입력하세요.'); return; }
    await supabase.from('report_subscriptions').insert(form);
    setForm({ recipient_name: '', report_types: '일간', channel: '카카오톡', send_time: '17:35' });
    load();
  };

  const toggle = async (row) => {
    await supabase.from('report_subscriptions').update({ is_active: !row.is_active }).eq('id', row.id);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await supabase.from('report_subscriptions').delete().eq('id', id);
    load();
  };

  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;

  return (
    <div style={box.page}>
      <h2 style={box.title}>리포트 구독 설정</h2>
      <div style={box.card}>
        <table style={box.table}>
          <thead><tr><th style={box.th}>수신자</th><th style={box.th}>리포트</th><th style={box.th}>채널</th><th style={box.th}>발송시각</th><th style={box.th}>상태</th><th style={box.th}></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={box.td}>{r.recipient_name}</td>
                <td style={box.td}>{r.report_types}</td>
                <td style={box.td}>{r.channel}</td>
                <td style={box.td}>{r.send_time}</td>
                <td style={box.td}>
                  <button onClick={() => toggle(r)} style={{ ...pill(r.is_active ? COLORS.greenBg : '#edf2f7', r.is_active ? COLORS.green : COLORS.steel), border: 'none', cursor: 'pointer' }}>
                    {r.is_active ? '활성' : '비활성'}
                  </button>
                </td>
                <td style={box.td}><button onClick={() => remove(r.id)} style={{ ...box.ghostBtn, padding: '6px 14px', fontSize: '13px' }}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>신규 구독 추가</h3>
        <div style={box.formGrid}>
          <div><label style={box.label}>수신자</label><input style={box.input} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} placeholder="이름" /></div>
          <div><label style={box.label}>리포트 종류</label>
            <select style={box.input} value={form.report_types} onChange={(e) => setForm({ ...form, report_types: e.target.value })}>
              <option>일간</option><option>주간</option><option>월간</option><option>일간+월간</option>
            </select>
          </div>
          <div><label style={box.label}>채널</label>
            <select style={box.input} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option>카카오톡</option><option>이메일</option>
            </select>
          </div>
          <div><label style={box.label}>발송 시각</label><input style={box.input} value={form.send_time} onChange={(e) => setForm({ ...form, send_time: e.target.value })} placeholder="17:35" /></div>
        </div>
        <div style={{ marginTop: '16px' }}><button style={box.primaryBtn} onClick={add}>추가</button></div>
      </div>
    </div>
  );
}
