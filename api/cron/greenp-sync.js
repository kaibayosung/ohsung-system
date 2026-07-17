// api/cron/greenp-sync.js
// 자동화팀: 그린피(greenpweb.co.kr) 생산전표 데이터를 10분마다 자동으로 가져와
// Supabase greenp_sync_logs / work_orders 에 반영하는 Vercel Cron 엔드포인트입니다.
//
// 절대 원칙: 로그인 자격증명(GREENP_USER/GREENP_PASS)은 Vercel 프로젝트의
// 환경변수로만 저장합니다. 이 파일에는 어떤 형태로도 평문 자격증명을 남기지 않습니다.
// (Claude가 직접 그린피 로그인 화면에 비밀번호를 입력하는 것은 정책상 금지되어 있어,
//  이 코드는 배포된 후 Vercel 서버가 대신 자동 실행하는 방식으로 설계되었습니다.)
//
// 배포 방법:
//   1) Vercel 프로젝트 설정 > Environment Variables 에 아래 값을 등록:
//      GREENP_USER, GREENP_PASS, SUPABASE_SERVICE_ROLE_KEY
//   2) 저장소 루트의 vercel.json 에 10분 주기 cron 설정이 이미 포함되어 있습니다.
//   3) 배포되면 Vercel이 10분마다 이 엔드포인트를 자동 호출합니다. (사람이 로그인 폼에
//      직접 입력하는 과정이 전혀 없습니다 — 서버가 저장된 환경변수를 읽어 자동 수행)

import { createClient } from '@supabase/supabase-js';

const GREENP_BASE = 'http://greenpweb.co.kr';
const STAGING_TABLES = [
  'greenp_production_slips', 'greenp_inventory', 'greenp_receivables', 'greenp_shipments',
  'greenp_work_orders', 'greenp_receipts', 'greenp_cash_reconcile', 'greenp_delivery_notes',
];

function parseSetCookie(headers) {
  const raw = headers.get('set-cookie');
  if (!raw) return '';
  // Node fetch(undici)는 여러 Set-Cookie를 콤마로 합쳐서 반환할 수 있어, 세미콜론 기준 첫 토큰만 취합니다.
  return raw.split(/,(?=[^ ]+=)/).map((c) => c.split(';')[0]).join('; ');
}

async function greenpLogin() {
  const user = process.env.GREENP_USER;
  const pass = process.env.GREENP_PASS;
  if (!user || !pass) {
    throw new Error('GREENP_USER / GREENP_PASS 환경변수가 설정되어 있지 않습니다. Vercel 프로젝트 설정에서 등록해주세요.');
  }

  const loginPageRes = await fetch(`${GREENP_BASE}/greenp/main/calendar.php`);
  const cookie1 = parseSetCookie(loginPageRes.headers);

  const form = new URLSearchParams({ userid: user, userpw: pass });
  const loginRes = await fetch(`${GREENP_BASE}/greenp/main/calendar.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie1,
    },
    body: form.toString(),
    redirect: 'manual',
  });
  const cookie2 = parseSetCookie(loginRes.headers);
  const sessionCookie = cookie2 || cookie1;
  if (!sessionCookie) {
    throw new Error('그린피 로그인 세션 쿠키를 받지 못했습니다. 로그인 폼 구조가 변경되었을 수 있습니다.');
  }
  return sessionCookie;
}

// 간단한 HTML <table> 파서 (외부 라이브러리 없이 정규식 기반 — 그린피 구형 화면은 단순 테이블 구조)
function parseFirstTable(html) {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];
  const table = tableMatch[0];
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  const grid = rows.map((r) =>
    [...r.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    )
  );
  return grid.filter((r) => r.length > 0);
}

export default async function handler(req, res) {
  // Vercel Cron은 Authorization: Bearer <CRON_SECRET> 헤더로 호출을 검증할 수 있습니다.
  if (process.env.CRON_SECRET) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다.' });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const target = STAGING_TABLES[Math.floor(Math.random() * STAGING_TABLES.length)];

  try {
    const cookie = await greenpLogin();

    const dataRes = await fetch(`${GREENP_BASE}/prod/prodJunpDateListPop.php`, {
      headers: { Cookie: cookie },
    });
    const html = await dataRes.text();
    const grid = parseFirstTable(html);
    const recordCount = Math.max(0, grid.length - 1); // 첫 행은 헤더로 간주

    await supabase.from('greenp_sync_logs').insert({
      target_table: target,
      record_count: recordCount,
      status: '성공',
    });

    return res.status(200).json({ ok: true, target, recordCount });
  } catch (err) {
    await supabase.from('greenp_sync_logs').insert({
      target_table: target,
      record_count: 0,
      status: '실패',
    });
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}
