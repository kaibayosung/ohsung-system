// src/lib/fixedCosts.js
// 월별 고정비 계산 공통 로직.
//
// 2026-07-24 업데이트: 대표님 확인 결과, 통장 실제 출금내역(거래내역조회) 기준으로
// 5~6월 안정적으로 나가는 고정비(4대보험/대출이자/카드대금/수도광열비/통신비/
// 위탁대행·기타, 급여 제외) 평균 21,069,332.5원을 공식 기준으로 확정함.
// ("5월부터 나가니까. 그걸 기준으로 해줘")
//
// 문제: 지출결의서(expense_requests)에 실제 입력된 금액이 통장 실적보다 항상 작음
// (카드대금/위탁대행 등 일부 미입력 건 존재). 따라서 expense_requests 기준 자동
// 집계만으로는 대표님이 확정한 기준과 어긋날 수 있음.
//
// 해결: monthly_fixed_costs 테이블(총액 1건/월)에 "확정 고정비" 값을 기록해두고,
// 조회 시 해당 월(또는 값이 없으면 가장 최근 확정월)의 확정값을 total로 우선 사용.
// byCategory는 여전히 expense_requests 기준 상세 내역(참고용)으로 표시.
import { supabase } from '../supabaseClient';

export const FIXED_COST_CATEGORY_ORDER = ['급여', '4대보험', '퇴직연금', '대출이자', '카드대금', '수도광열비', '통신비', '위탁대행/기타'];

export async function fetchMonthlyFixedCosts(startDate, endDate) {
  const yearMonth = (startDate || '').slice(0, 7);

  const [expenseRes, confirmedRes] = await Promise.all([
    supabase
      .from('expense_requests')
      .select('id, request_date, status, is_recurring, recurring_key, expense_request_items(amount, vendor_name, item_name)')
      .eq('is_recurring', true)
      .eq('status', '결재완료')
      .gte('request_date', startDate)
      .lte('request_date', endDate),
    yearMonth
      ? supabase
          .from('monthly_fixed_costs')
          .select('year_month, amount')
          .lte('year_month', yearMonth)
          .order('year_month', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const { data, error } = expenseRes;
  const byCategoryMap = {};
  const rows = [];
  let computedTotal = 0;

  if (!error && data) {
    data.forEach((req) => {
      (req.expense_request_items || []).forEach((item) => {
        const amt = Number(item.amount || 0);
        computedTotal += amt;
        const key = req.recurring_key || '기타';
        byCategoryMap[key] = (byCategoryMap[key] || 0) + amt;
        rows.push({ requestId: req.id, date: req.request_date, category: key, vendor: item.vendor_name, item: item.item_name, amount: amt });
      });
    });
  }

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

  const confirmedRow = confirmedRes && !confirmedRes.error && confirmedRes.data && confirmedRes.data[0];
  const confirmedTotal = confirmedRow ? Number(confirmedRow.amount) : null;
  const confirmedMonth = confirmedRow ? confirmedRow.year_month : null;

  return {
    // 대표님 확정 기준(통장 실적 기반)이 있으면 그 값을 사용, 없으면 지출결의서 자동집계값 사용
    total: confirmedTotal != null ? confirmedTotal : computedTotal,
    computedTotal,
    confirmedTotal,
    confirmedMonth,
    isConfirmed: confirmedTotal != null,
    byCategory,
    rows,
  };
}
