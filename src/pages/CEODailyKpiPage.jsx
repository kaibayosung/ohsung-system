// src/pages/CEODailyKpiPage.jsx
// 대표님 일일 경영 리포트 — 카카오톡 공유용 (화면 캡처 방식)
// 반응형: 좁은 화면(모바일)에서는 세로 카드 1열, 넓은 화면(PC)에서는 3열 그리드로 자동 전환됩니다.
// 필요한 데이터는 전부 기존 화면(영업 워크플로우 · 월간 분석)에서 이미 쓰고 있는 테이블을 그대로 재사용합니다:
//  - 오늘/월 매출: sales_records(가공 매출) + scrap_sales(스크랩 매출)
//  - 월 고정비: monthly_fixed_costs (월간 분석 화면에서 입력/저장)
//  - 오늘 거래처 TOP2: sales_records를 거래처별로 합산 후 상위 2건
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtManwon(v) {
  return Math.round((v || 0) / 10000).toLocaleString();
}

function nowLabel() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const ampm = d.getHours() < 12 ? '오전' : '오후';
  const h12 = d.getHours() % 12 || 12;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) · ${ampm} ${h12}:${d.getMinutes().toString().padStart(2, '0')} 기준`;
}

export default function CEODailyKpiPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ todaySales: 0, monthSales: 0, monthFixedCost: 0, topCompanies: [] });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const today = todayStr();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthStart = `${yearMonth}-01`;

    const [
      { data: todaySalesRows },
      { data: todayScrapRows },
      { data: monthSalesRows },
      { data: monthScrapRows },
      { data: fixedRow },
    ] = await Promise.all([
      supabase.from('sales_records').select('total_price, customer_name').eq('work_date', today),
      supabase.from('scrap_sales').select('total_amount').eq('sale_date', today),
      supabase.from('sales_records').select('total_price').gte('work_date', monthStart).lte('work_date', today),
      supabase.from('scrap_sales').select('total_amount').gte('sale_date', monthStart).lte('sale_date', today),
      supabase.from('monthly_fixed_costs').select('amount').eq('year_month', yearMonth).maybeSingle(),
    ]);

    const todaySales = (todaySalesRows || []).reduce((s, r) => s + Number(r.total_price || 0), 0)
      + (todayScrapRows || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const monthSales = (monthSalesRows || []).reduce((s, r) => s + Number(r.total_price || 0), 0)
      + (monthScrapRows || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const monthFixedCost = fixedRow ? Number(fixedRow.amount || 0) : 0;

    const companyMap = {};
    (todaySalesRows || []).forEach((r) => {
      const n = r.customer_name || '미지정';
      companyMap[n] = (companyMap[n] || 0) + Number(r.total_price || 0);
    });
    const topCompanies = Object.entries(companyMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 2);

    setData({ todaySales, monthSales, monthFixedCost, topCompanies });
    setLoading(false);
  };

  const { todaySales, monthSales, monthFixedCost, topCompanies } = data;
  const diff = monthSales - monthFixedCost;
  const isProfit = diff >= 0;
  const ratio = monthFixedCost > 0 ? Math.round((monthSales / monthFixedCost) * 100) : null;

  return (
    <div style={styles.page}>
      <div style={styles.card} id="ceo-daily-kpi-card">
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <span style={styles.headerIcon}>📊</span>
            <span style={styles.headerTitle}>오성철강 일일 경영 리포트</span>
          </div>
          <div style={styles.headerDate}>{nowLabel()}</div>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF', fontSize: '15px' }}>불러오는 중...</div>
        ) : (
          <div style={styles.grid}>
            <div style={{ ...styles.kpiCard, background: isProfit ? '#EAF7EF' : '#FCEAEA' }}>
              <div style={styles.kpiLabel}>이번달 손익 현황</div>
              <div style={{ ...styles.kpiBig, color: isProfit ? '#1E8E4F' : '#D93B2B' }}>{isProfit ? '📈 흑자' : '📉 적자'}</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>📅 오늘 매출</div>
              <div style={styles.kpiValue}>{fmtManwon(todaySales)}<span style={styles.kpiUnit}>만원</span></div>
              <div style={styles.kpiSub}>가공 매출 + 스크랩</div>
            </div>
            <div style={{ ...styles.kpiCard, background: '#F5F7FF' }}>
              <div style={styles.kpiLabel}>월 매출 − 월 고정비</div>
              <div style={{ ...styles.kpiValue, color: isProfit ? '#1E8E4F' : '#D93B2B' }}>{isProfit ? '+' : ''}{fmtManwon(diff)}<span style={styles.kpiUnit}>만원</span></div>
              <div style={styles.kpiSub}>{ratio !== null ? `고정비 대비 매출 ${ratio}%` : '월 고정비 미입력'}</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>월 매출</div>
              <div style={styles.kpiValue}>{fmtManwon(monthSales)}<span style={styles.kpiUnit}>만원</span></div>
              <div style={styles.kpiSub}>이번달 1일 ~ 오늘 누적</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>월 고정비</div>
              <div style={styles.kpiValue}>{fmtManwon(monthFixedCost)}<span style={styles.kpiUnit}>만원</span></div>
              {monthFixedCost === 0 && <div style={styles.kpiSub}>※ '월간 분석' 화면에서 입력하세요</div>}
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>🏆 오늘 거래처 TOP2</div>
              {topCompanies.length === 0 ? (
                <div style={{ ...styles.kpiSub, marginTop: '10px' }}>오늘 매출 실적 없음</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '8px' }}>
                  {topCompanies.map((c) => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ fontWeight: 700, color: '#1A1B3A' }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: '#1A1B3A' }}>{Number(c.amount).toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div style={styles.footer}>오성철강 SMART ERP 2.0 · 대표님 전용 요약</div>
      </div>

      <div className="no-print" style={styles.hint}>
        📸 카카오톡 공유 방법: 위 카드 영역을 화면 캡처(스크린샷)해서 그대로 전송하면 됩니다. 휴대폰으로 열면 세로 카드로, PC로 열면 3열 그리드로 자동으로 바뀝니다.
      </div>
      <button className="no-print" onClick={load} style={styles.refreshBtn}>🔄 새로고침</button>
    </div>
  );
}

const styles = {
  page: { minHeight: '100%', background: '#F4F6FA', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  card: { width: '100%', maxWidth: '860px', background: '#fff', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(15,30,51,0.08)' },
  header: { background: 'linear-gradient(135deg,#16283f,#0a1524)', color: '#fff', padding: '24px 26px' },
  headerTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  headerIcon: { fontSize: '20px' },
  headerTitle: { fontSize: '19px', fontWeight: 800, letterSpacing: '-0.01em' },
  headerDate: { fontSize: '13px', color: 'rgba(255,255,255,0.65)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', padding: '22px' },
  kpiCard: { background: '#F9FAFC', border: '1px solid #EDEFF3', borderRadius: '14px', padding: '18px' },
  kpiLabel: { fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '10px' },
  kpiBig: { fontSize: '25px', fontWeight: 900 },
  kpiValue: { fontSize: '27px', fontWeight: 900, color: '#1A1B3A' },
  kpiUnit: { fontSize: '14px', fontWeight: 700, color: '#9CA3AF', marginLeft: '4px' },
  kpiSub: { fontSize: '12.5px', color: '#9CA3AF', marginTop: '7px' },
  footer: { textAlign: 'center', fontSize: '11.5px', color: '#9CA3AF', padding: '14px', borderTop: '1px solid #EDEFF3' },
  hint: { marginTop: '16px', fontSize: '13.5px', color: '#6B7280', maxWidth: '860px', textAlign: 'center', lineHeight: 1.6 },
  refreshBtn: { marginTop: '14px', border: '1px solid #E7E9EE', background: '#fff', color: '#4D5C72', fontSize: '14px', fontWeight: 700, padding: '9px 18px', borderRadius: '9px', cursor: 'pointer' },
};
