// src/lib/fixedCosts.js
// 월별 고정비 계산 공통 로직.
//
// 2026-07-24 업데이트: 대표님 확인 결과, 통장 실제 출금내역(거래내역조회) 기준으로
// 계좌 2개(1005-404-709760, 433-910049-16804) 통장 실적을 통합 분석해 월 57,579,020원을
// 공식 기준으로 확정함. 급여는 2026-05부터 두번째 계좌로 지급 방식이 바뀐 것을 확인,
// 그 계좌의 실제 급여이체 내역(월평균 33,977,900원)을 사용 -- 첫 계좌 기준 추정치(10개월
// 평균 60,007,524원)는 임가공/장비비 등이 섞인 오분류였음이 밝혀져 폐기함.
//
// 항목별 상세(인건비/4대보험/대출이자/수도광열비/카드대금/법인카드대금/단체보험·적립/
// 보험료/공제부금(노란우산)/통신·렌탈·경비비/위탁대행기타/통신비, 총 12개 항목)는
// monthly_fixed_cost_items 테이블에 저장되어 있으며, "최소 월 필요 자금" 표(대표님 확정본)와
// 정확히 일치합니다.
//
// 우선순위: monthly_fixed_cost_items(확정 상세 내역) > monthly_fixed_costs(확정 총액만) >
// expense_requests(정기지출 결재완료 자동집계, 폴백)
import { supabase } from '../supabaseClient';

export const FIXED_COST_CATEGORY_ORDER = ['급여', '4대보험', '퇴직연금', '대출이자', '카드대금', '수도광열비', '통신비', '위탁대행/기타'];

export async function fetchMonthlyFixedCosts(startDate, endDate) {
  const yearMonth = (startDate || '').slice(0, 7);

  const [expenseRes, confirmedRes, itemsRes] = await Promise.all([
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
    yearMonth
      ? supabase
          .from('monthly_fixed_cost_items')
          .select('year_month, category, amount, account_label, note')
          .lte('year_month', yearMonth)
          .order('year_month', { ascending: false })
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

  const computedByCategory = Object.entries(byCategoryMap)
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

  // 확정 상세 항목: 가장 최근 확정월(confirmedMonth)의 12개 항목만 사용
  let itemRows = itemsRes && !itemsRes.error && itemsRes.data ? itemsRes.data : [];
  if (confirmedMonth) {
    itemRows = itemRows.filter((r) => r.year_month === confirmedMonth);
  } else {
    itemRows = [];
  }
  const confirmedByCategory = itemRows
    .map((r) => ({ name: r.category, amount: Number(r.amount), account: r.account_label, note: r.note }))
    .sort((a, b) => b.amount - a.amount);

  const hasConfirmedItems = confirmedByCategory.length > 0;

  return {
    // 확정 상세 항목이 있으면 그걸 우선 사용(항목 합계가 total과 정확히 일치),
    // 없으면 확정 총액만 사용, 그마저 없으면 지출결의서 자동집계값 사용
    total: confirmedTotal != null ? confirmedTotal : computedTotal,
    computedTotal,
    confirmedTotal,
    confirmedMonth,
    isConfirmed: confirmedTotal != null,
    byCategory: hasConfirmedItems ? confirmedByCategory : computedByCategory,
    isBreakdownConfirmed: hasConfirmedItems,
    computedByCategory,
    rows,
  };
}
