// src/lib/fixedCosts.js
// 월별 고정비 계산 공통 로직.
// 이전에는 관리자가 매달 손으로 입력하는 monthly_fixed_costs 테이블(총액 1건)을 썼는데,
// 정작 그 입력 화면(Report.jsx)이 메뉴 어디에도 연결되어 있지 않아 1월 이후로 갱신된 적이
// 없었습니다. 대신 이미 지출결의서(expense_requests/expense_request_items)에 정기 지출
// (is_recurring=true, 결재완료)로 분류해둔 실제 항목들 — 4대보험/수도광열비/대출이자/
// 카드대금/위탁대행·기타/통신비/급여/퇴직연금 — 이 그대로 "고정비" 실적 데이터이므로
// 이걸 기준으로 월별 고정비를 자동 집계합니다.
import { supabase } from '../supabaseClient';

export const FIXED_COST_CATEGORY_ORDER = ['급여', '4대보험', '퇴직연금', '대출이자', '카드대금', '수도광열비', '통신비', '위탁대행/기타'];

export async function fetchMonthlyFixedCosts(startDate, endDate) {
  const { data, error } = await supabase
    .from('expense_requests')
    .select('id, request_date, status, is_recurring, recurring_key, expense_request_items(amount, vendor_name, item_name)')
    .eq('is_recurring', true)
    .eq('status', '결재완료')
    .gte('request_date', startDate)
    .lte('request_date', endDate);

  if (error || !data) return { total: 0, byCategory: [], rows: [] };

  const byCategoryMap = {};
  const rows = [];
  let total = 0;
  data.forEach((req) => {
    (req.expense_request_items || []).forEach((item) => {
      const amt = Number(item.amount || 0);
      total += amt;
      const key = req.recurring_key || '기타';
      byCategoryMap[key] = (byCategoryMap[key] || 0) + amt;
      rows.push({ requestId: req.id, date: req.request_date, category: key, vendor: item.vendor_name, item: item.item_name, amount: amt });
    });
  });

  const byCategory = Object.entries(byCategoryMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => {
      const ia = FIXED_COST_CATEGORY_ORDER.indexOf(a.name);
      const ib = FIXED_COST_CATEGORY_ORDER.indexOf(b.name);
      if (ia === -1 && ib === -1) return b.amount - a.amount;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

  return { total, byCategory, rows };
}
