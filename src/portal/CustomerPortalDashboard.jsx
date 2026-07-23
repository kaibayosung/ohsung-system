// src/portal/CustomerPortalDashboard.jsx
// 고객사 포털 로그인 후 첫 화면 — 요약 카드 + 퀵액션 + 최근 출고/입고 + 모바일 하단탭바
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const C = {
  primary: '#2E3192', primaryHover: '#252873',
  textPrimary: '#1A1B3A', textSecondary: '#6B7280', textMuted: '#9CA3AF',
  outerBg: '#F5F6F8', surface: '#F9FAFB', card: '#FFFFFF',
  border: '#ECEEF2', inputBorder: '#E7E9EE',
};

function todayStr() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); }
function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}
function fmtKDate(s) { if (!s) return '-'; const [, m, d] = (s || '').split('-'); return m && d ? `${parseInt(m, 10)}/${parseInt(d, 10)}` : s; }

const QUICK_ACTIONS = [
  { sub: 'inventory', icon: '📦', label: '재고 현황' },
  { sub: 'work', icon: '🛠', label: '작업 내역' },
  { sub: 'outbound', icon: '🚚', label: '출고 내역' },
  { sub: 'inbound', icon: '📥', label: '입고 내역' },
  { sub: 'place', icon: '📝', label: '발주하기' },
];

const TAB_ITEMS = [
  { key: 'home', icon: '🏠', label: '홈' },
  { key: 'inventory', icon: '📦', label: '재고' },
  { key: 'outbound', icon: '🚚', label: '출고' },
  { key: 'inbound', icon: '📥', label: '입고' },
  { key: 'place', icon: '📝', label: '발주' },
];

export default function CustomerPortalDashboard({ companyName, onNavigate }) {
  const [stats, setStats] = useState({ inventory: 0, outbound: 0, inbound: 0, inProgress: 0 });
  const [recentOut, setRecentOut] = useState([]);
  const [recentIn, setRecentIn] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyName) return;
    let cancelled = false;
    setLoading(true);
    const today = todayStr();
    const monthStart = monthStartStr();

    Promise.all([
      supabase.from('greenp_inventory').select('remaining_weight').eq('customer_name', companyName),
      supabase.from('greenp_outbound').select('weight').eq('company_name', companyName).gte('outbound_date', monthStart).lte('outbound_date', today),
      supabase.from('greenp_inbound').select('weight').eq('company_name', companyName).gte('inbound_date', monthStart).lte('inbound_date', today),
      supabase.from('greenp_joborders').select('id', { count: 'exact', head: true }).eq('company_name', companyName).neq('status', '작업완료'),
      supabase.from('greenp_outbound').select('outbound_date, product_name, spec, weight').eq('company_name', companyName).order('outbound_date', { ascending: false }).limit(5),
      supabase.from('greenp_inbound').select('inbound_date, product_name, spec, weight').eq('company_name', companyName).order('inbound_date', { ascending: false }).limit(5),
    ]).then(([inv, out, inb, prog, recentOutRes, recentInRes]) => {
      if (cancelled) return;
      const sum = (rows, key) => (rows || []).reduce((s, r) => s + Number(r[key] || 0), 0);
      setStats({
        inventory: sum(inv.data, 'remaining_weight') / 1000,
        outbound: sum(out.data, 'weight') / 1000,
        inbound: sum(inb.data, 'weight') / 1000,
        inProgress: prog.count || 0,
      });
      setRecentOut(recentOutRes.data || []);
      setRecentIn(recentInRes.data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [companyName]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 20px 90px' }}>
      <style>{`
        .cp-dash-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .cp-dash-actions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .cp-dash-recent { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .cp-dash-tabbar { display: none; }
        @media (max-width: 720px) {
          .cp-dash-cards { grid-template-columns: repeat(2, 1fr); }
          .cp-dash-actions { grid-template-columns: repeat(3, 1fr); }
          .cp-dash-recent { grid-template-columns: 1fr; }
          .cp-dash-tabbar {
            display: flex; position: sticky; bottom: 0; background: #fff;
            border-top: 1px solid ${C.border}; margin: 24px -20px -90px; padding: 6px 4px;
          }
        }
      `}</style>

      <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '16px' }}>
        📅 {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' })} 기준
      </div>

      <div className="cp-dash-cards" style={{ marginBottom: '18px' }}>
        {[
          { label: '총 재고 잔량', icon: '📦', value: stats.inventory.toFixed(1), unit: '톤' },
          { label: '이번달 출고', icon: '🚚', value: stats.outbound.toFixed(1), unit: '톤' },
          { label: '이번달 입고', icon: '📥', value: stats.inbound.toFixed(1), unit: '톤' },
          { label: '진행중 작업', icon: '🛠', value: stats.inProgress, unit: '건' },
        ].map((c) => (
          <div key={c.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>{c.icon} {c.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: C.textPrimary }}>
              {loading ? '-' : c.value} <span style={{ fontSize: '13px', color: C.textMuted, fontWeight: 500 }}>{c.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cp-dash-actions" style={{ marginBottom: '22px' }}>
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.sub}
            onClick={() => onNavigate(a.sub)}
            style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: '14px', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = '#F9F9FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
          >
            <span style={{ fontSize: '22px' }}>{a.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{a.label}</span>
          </button>
        ))}
      </div>

      <div className="cp-dash-recent">
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, marginBottom: '8px' }}>🚚 최근 출고</div>
          {recentOut.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: '14px', padding: '10px 0' }}>{loading ? '불러오는 중...' : '최근 출고 내역이 없습니다.'}</div>
          ) : recentOut.map((r, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{r.spec || r.product_name || '-'}</div>
                <div style={{ fontSize: '12px', color: C.textMuted }}>{fmtKDate(r.outbound_date)}</div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: C.primary }}>{Number(r.weight || 0).toLocaleString()}kg</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, marginBottom: '8px' }}>📥 최근 입고</div>
          {recentIn.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: '14px', padding: '10px 0' }}>{loading ? '불러오는 중...' : '최근 입고 내역이 없습니다.'}</div>
          ) : recentIn.map((r, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{r.spec || r.product_name || '-'}</div>
                <div style={{ fontSize: '12px', color: C.textMuted }}>{fmtKDate(r.inbound_date)}</div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: C.textPrimary }}>{Number(r.weight || 0).toLocaleString()}kg</div>
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
            <span style={{ fontSize: '19px' }}>{t.icon}</span>
            <span style={{ fontSize: '10.5px', fontWeight: 700 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
