// src/portal/CustomerPortalDashboard.jsx
// 고객사 포털 로그인 후 첫 화면 — 요약 카드 + 빠른 메뉴 + 두께별 재고 파이그래프 + 작업완료·미출고 재고
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const C = {
  primary: '#2E3192', primaryHover: '#252873',
  textPrimary: '#1A1B3A', textSecondary: '#6B7280', textMuted: '#9CA3AF',
  outerBg: '#F5F6F8', surface: '#F9FAFB', card: '#FFFFFF',
  border: '#ECEEF2', inputBorder: '#E7E9EE',
};

const PIE_COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#BA7517', '#7F77DD'];
const PIE_OTHER_COLOR = '#9CA3AF';

function todayStr() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); }
function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}
function fmtKDate(s) { if (!s) return '-'; const [, m, d] = (s || '').split('-'); return m && d ? `${parseInt(m, 10)}/${parseInt(d, 10)}` : s; }

// spec 예: "0.95X4XC" -> 앞자리 숫자가 두께(mm)
function parseThickness(spec) {
  if (!spec) return null;
  const n = parseFloat(String(spec).split('X')[0]);
  return Number.isFinite(n) ? n : null;
}

function daysAgo(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  const now = new Date();
  return Math.max(0, Math.floor((now - d) / 86400000));
}

const QUICK_ACTIONS = [
  { sub: 'inventory', icon: '📦', label: '재고 현황' },
  { sub: 'work', icon: '🛠', label: '작업 내역' },
  { sub: 'outbound', icon: '🚚', label: '출고 내역' },
  { sub: 'inbound', icon: '📥', label: '입고 내역' },
];

const TAB_ITEMS = [
  { key: 'home', icon: '🏠', label: '홈' },
  { key: 'inventory', icon: '📦', label: '재고' },
  { key: 'outbound', icon: '🚚', label: '출고' },
  { key: 'inbound', icon: '📥', label: '입고' },
  { key: 'place', icon: '📝', label: '발주' },
];

export default function CustomerPortalDashboard({ companyName, onNavigate }) {
  const [stats, setStats] = useState({ inventory: 0, outbound: 0, inbound: 0, inProgress: 0, invCount: 0, outCount: 0, inCount: 0 });
  const [thickness, setThickness] = useState([]); // [{label, count, color}]
  const [thicknessTotal, setThicknessTotal] = useState(0);
  const [unshipped, setUnshipped] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyName) return;
    let cancelled = false;
    setLoading(true);
    const today = todayStr();
    const monthStart = monthStartStr();

    Promise.all([
      supabase.from('greenp_inventory').select('spec, remaining_weight').eq('customer_name', companyName),
      supabase.from('greenp_outbound').select('weight').eq('company_name', companyName).gte('outbound_date', monthStart).lte('outbound_date', today),
      supabase.from('greenp_inbound').select('weight').eq('company_name', companyName).gte('inbound_date', monthStart).lte('inbound_date', today),
      supabase.from('greenp_joborders').select('id', { count: 'exact', head: true }).eq('company_name', companyName).neq('status', '작업완료'),
      supabase.from('greenp_joborder_detail').select('joborder_no, joborder_date, product_name, spec, used_weight').eq('company_name', companyName).order('joborder_date', { ascending: false }),
      supabase.from('greenp_outbound').select('product_name').eq('company_name', companyName),
    ]).then(([inv, out, inb, prog, jobDetail, outboundNames]) => {
      if (cancelled) return;
      const sum = (rows, key) => (rows || []).reduce((s, r) => s + Number(r[key] || 0), 0);

      setStats({
        inventory: sum(inv.data, 'remaining_weight') / 1000,
        outbound: sum(out.data, 'weight') / 1000,
        inbound: sum(inb.data, 'weight') / 1000,
        inProgress: prog.count || 0,
        invCount: (inv.data || []).length,
        outCount: (out.data || []).length,
        inCount: (inb.data || []).length,
      });

      // 두께별 재고 개수 집계
      const counts = new Map();
      (inv.data || []).forEach((r) => {
        const t = parseThickness(r.spec);
        if (t === null) return;
        counts.set(t, (counts.get(t) || 0) + 1);
      });
      const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      const top = sorted.slice(0, 5);
      const restCount = sorted.slice(5).reduce((s, [, c]) => s + c, 0);
      const total = sorted.reduce((s, [, c]) => s + c, 0);
      const rows = top.map(([t, c], i) => ({ label: `${t}T`, count: c, color: PIE_COLORS[i % PIE_COLORS.length] }));
      if (restCount > 0) rows.push({ label: '기타', count: restCount, color: PIE_OTHER_COLOR });
      setThickness(rows);
      setThicknessTotal(total);

      // 작업완료(joborder_detail) 되었지만 출고 기록(product_name 매칭)이 없는 재고 = 미출고
      const shippedSet = new Set((outboundNames.data || []).map((r) => r.product_name).filter(Boolean));
      const unshippedRows = (jobDetail.data || [])
        .filter((d) => d.product_name && !shippedSet.has(d.product_name))
        .map((d) => ({ ...d, waitDays: daysAgo(d.joborder_date) }));
      setUnshipped(unshippedRows);

      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [companyName]);

  const pieGradient = (() => {
    if (thicknessTotal === 0) return `conic-gradient(${C.border} 0 100%)`;
    let acc = 0;
    const stops = thickness.map((t) => {
      const from = acc;
      acc += (t.count / thicknessTotal) * 100;
      return `${t.color} ${from}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  })();

  const unshippedWeight = unshipped.reduce((s, r) => s + Number(r.used_weight || 0), 0) / 1000;

  const waitColor = (days) => (days >= 3 ? '#993C1D' : days === 2 ? '#854F0B' : '#3B6D11');
  const waitDot = (days) => (days >= 3 ? '#D85A30' : days === 2 ? '#EF9F27' : '#97C459');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 20px 90px' }}>
      <style>{`
        .cp-dash-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .cp-dash-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .cp-dash-body { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; align-items: start; }
        .cp-dash-tabbar { display: none; }
        @media (max-width: 720px) {
          .cp-dash-cards { grid-template-columns: repeat(2, 1fr); }
          .cp-dash-actions { grid-template-columns: repeat(4, 1fr); }
          .cp-dash-body { grid-template-columns: 1fr; }
          .cp-dash-tabbar {
            display: flex; position: sticky; bottom: 0; background: #fff;
            border-top: 1px solid ${C.border}; margin: 24px -20px -90px; padding: 6px 4px;
          }
        }
      `}</style>

      <div style={{ fontSize: '15px', color: C.textMuted, marginBottom: '18px' }}>
        📅 {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' })} 기준
      </div>

      <div className="cp-dash-cards" style={{ marginBottom: '16px' }}>
        {[
          { label: '총 재고 잔량', icon: '📦', value: stats.inventory.toFixed(1), unit: '톤', count: stats.invCount, bg: '#E6F1FB', fg: '#0C447C' },
          { label: '이번달 출고', icon: '🚚', value: stats.outbound.toFixed(1), unit: '톤', count: stats.outCount, bg: '#FAECE7', fg: '#993C1D' },
          { label: '이번달 입고', icon: '📥', value: stats.inbound.toFixed(1), unit: '톤', count: stats.inCount, bg: '#E1F5EE', fg: '#0F6E56' },
          { label: '진행중 작업', icon: '🛠', value: stats.inProgress, unit: '건', count: null, bg: C.surface, fg: C.textPrimary },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, borderRadius: '14px', padding: '18px' }}>
            <div style={{ fontSize: '15px', color: c.fg, marginBottom: '8px' }}>{c.icon} {c.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: c.fg }}>
              {loading ? '-' : c.value} <span style={{ fontSize: '15px', fontWeight: 500 }}>{c.unit}</span>
            </div>
            {c.count !== null && (
              <div style={{ fontSize: '14px', color: c.fg, opacity: 0.75, marginTop: '4px' }}>
                {loading ? '' : `코일 ${c.count.toLocaleString()}개`}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="cp-dash-actions" style={{ marginBottom: '20px' }}>
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.sub}
            onClick={() => onNavigate(a.sub)}
            style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: '14px', padding: '18px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = '#F9F9FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
          >
            <span style={{ fontSize: '26px' }}>{a.icon}</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>{a.label}</span>
          </button>
        ))}
      </div>

      <div className="cp-dash-body">
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0, borderRadius: '50%', background: pieGradient }}>
            <div style={{ position: 'absolute', inset: '24px', borderRadius: '50%', background: C.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary }}>{loading ? '-' : thicknessTotal}</div>
              <div style={{ fontSize: '13px', color: C.textMuted }}>총 재고 개수</div>
            </div>
          </div>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, marginBottom: '2px' }}>두께별 재고 수량</div>
            {loading ? (
              <div style={{ fontSize: '15px', color: C.textMuted }}>불러오는 중...</div>
            ) : thickness.length === 0 ? (
              <div style={{ fontSize: '15px', color: C.textMuted }}>재고 데이터가 없습니다.</div>
            ) : thickness.map((t) => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '15px' }}>
                <span>
                  <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: t.color, marginRight: '9px' }} />
                  {t.label}
                </span>
                <span style={{ color: C.textSecondary }}>{t.count}개 · {thicknessTotal ? Math.round((t.count / thicknessTotal) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#FAEEDA', borderRadius: '14px', padding: '20px 22px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#633806' }}>작업 완료 · 미출고 재고</div>
          <div style={{ fontSize: '14px', color: '#854F0B', marginBottom: '14px' }}>
            {loading ? '불러오는 중...' : `${unshipped.length}건 · ${unshippedWeight.toFixed(1)}톤 출고 대기중`}
          </div>
          {!loading && unshipped.length === 0 && (
            <div style={{ fontSize: '15px', color: '#854F0B' }}>출고 대기중인 재고가 없습니다.</div>
          )}
          {unshipped.map((r) => (
            <div key={r.product_name} style={{ background: C.card, borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: waitDot(r.waitDays), flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '15px', color: C.textPrimary }}>{r.spec || '-'}</div>
                  <div style={{ fontSize: '13px', color: C.textMuted }}>{fmtKDate(r.joborder_date)} 작업완료</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>{Number(r.used_weight || 0).toLocaleString()}kg</div>
                <div style={{ fontSize: '13px', color: waitColor(r.waitDays) }}>{r.waitDays}일째 대기</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cp-dash-tabbar">
        {TAB_ITEMS.map((t) => (
          <button
            key={t.key}
            onClick={() => onNavigate(t.key === 'home' ? null : t.key)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minHeight: '44px', background: 'transparent', border: 'none', color: t.key === 'home' ? C.primary : C.textMuted, cursor: 'pointer' }}
          >
            <span style={{ fontSize: '21px' }}>{t.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
