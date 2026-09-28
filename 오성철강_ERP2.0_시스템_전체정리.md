# 오성철강 스마트ERP2.0 — 시스템 전체 정리

## 1. 프로젝트 성격

기존에 회사가 쓰고 있는 "그린ERP"(그린피웹, greenpweb.co.kr)를 대체하는 게 아니라, **그 위에 얹는 레이어**다. 그린ERP 데이터를 Supabase로 읽기 전용 미러링해오고, 그 위에 이 프로젝트만의 화면·테이블·자동화를 쌓는 구조.

## 2. 한 리포, 세 개의 프론트엔드, 하나의 Supabase 백엔드

`vite.config.js`가 3개의 진입점을 정의하고, `vercel.json`이 URL을 각각의 정적 HTML로 라우팅한다.

| 진입점 | URL | 대상 | 루트 컴포넌트 |
|---|---|---|---|
| `index.html` | `/` | 오성철강 직원(사내) | `src/App.jsx` |
| `portal.html` | `/portal` | 거래처 고객사 | `src/portal/main.jsx` → `CustomerPortalGate.jsx` |
| `separator.html` | `/separator` | 슬리터2 현장 태블릿(키오스크) | `src/separator/main.jsx` → `SeparatorKioskGate.jsx` |

세 앱은 공통 레이아웃/라우터 없이 완전히 독립된 트리이며, 로그인한 `auth.uid()`가 어느 `*_users` 테이블에 속하는지로만 서로 구분된다.

`public/` 폴더는 Vite/Vercel이 그대로 서빙하므로, 라우팅 설정 없이 `warehouse-3d.html` 같은 독립 정적 HTML 도구를 바로 배포할 수 있다(이번에 만든 `ai-tension-monitor.html`도 이 패턴).

## 3. 데이터 모델

- **`greenp_*` 테이블** (joborders, joborder_detail, production, inbound, outbound, inventory, receivables, unshipped, customers 뷰, sync_logs) — 그린ERP를 Supabase Edge Function + `pg_cron`으로 주기적으로 미러링한 읽기 전용 테이블. **외부 소유, 주기적으로 통째로 덮어써짐**에 주의.
- **자체 테이블** — companies, receivables, shipments, sales_records, work_orders, products, order_items, coils, coil_closed_flags, expense_requests(+items), daily_ledger/ledger_records, work_log, scrap_sales, monthly_fixed_costs(+items), enfax_inbox/session, customer_fax_numbers, fax_send_schedule, inbound_fax_queue, access_logs, notifications, report_subscriptions, tax_invoices, sales_orders, kr_holidays, app_assets, company_inquiries, company_bank_accounts. 이 프로젝트가 직접 쓰고 관리.
- **PR-DTC-3100 관련 신규 테이블**: `ai_tension_readings`, `ai_tension_settings` (상세는 `PR-DTC-3100_OCR시스템_개발정리.md` 참고).

### 주의해야 할 함정 2가지

1. **greenp 동기화가 "오늘" 데이터를 통째로 덮어쓴다.** `greenp-sync-v2-*` cron이 ~10분마다 오늘자 `greenp_joborders`/`greenp_production` 등의 행을 전부 교체한다. 데모용으로 손으로 넣거나 고친 오늘 데이터는 다음 동기화 때 사라질 수 있다. 살려두려면 (a) 관련 `cron.job`을 `cron.alter_job(id, active=>false)`로 잠깐 꺼두거나, (b) 새로 삽입하는 대신 이미 있는 실제 행의 상태만 바꿔치기하는 걸 우선한다.
2. **"오늘" 계산은 항상 KST로.** `src/separator/SeparatorKiosk.jsx`의 `todayKST()`가 정석 패턴(`now.getTime() + 9*3600000` 후 `toISOString()`). 과거에 이 오프셋을 이중 적용해서 KST 09시 이전엔 어제 날짜가 나오는 버그가 있었음 — "하루 밀림" 버그를 보면 같은 실수인지부터 의심.

### Edge Functions

리포의 `supabase/functions/`에는 4개만 있음(`greenp-sync-v2`, `greenp-joborder-detail-sync`, `greenp-unshipped-sync`, `enfax-inbound-daily`). 실제 배포된 건 더 많음(`admin-create-account`, `admin-reset-password`, `send-ceo-email`, `enfax-ocr`, `enfax-send-discover`, `enfax-sync`, `greenp-explore`, 디버그용 몇 개). **리포만 보고 함수가 없다고 판단하지 말고 `list_edge_functions`로 실제 배포 목록을 항상 확인.**

`pg_cron`은 UTC 기준이라 KST 08:00~17:40 영업시간에 맞추려고 시간대를 쪼개 등록되어 있음(`*/10 0-7 * * *`, `0,10,20,30,40 8 * * *`, `0,10,20,30,40,50 23 * * *`).

## 4. 계정 / 권한 체계

공유 users 테이블 없이 완전히 분리된 두 테이블, 둘 다 `auth.users.id`로 연결:

- **`staff_users`**: id, email, name, role(staff/admin), is_active — 사내 앱(`/`)용.
- **`customer_users`**: id, email(nullable), login_id, company_name, contact_name, phone, is_active — 고객포털(`/portal`)용. 이메일 없이 `login_id`만으로 가입 가능(내부적으로 `{login_id}@ohsungportal.local`로 매핑). `customer_company_aliases`로 한 계정이 그린ERP상 여러 이름으로 등록된 거래처를 함께 보게 할 수 있음.

RLS는 테이블별 커스텀 정책 대신 3개의 `SECURITY DEFINER` 함수로 통일:

```sql
is_staff()               -- staff_users에 존재 + is_active
is_admin()                -- staff_users에 존재 + is_active + role='admin'
is_my_company(cn text)    -- cn이 본인 company_name이거나 customer_company_aliases에 있음
```

`greenp_*`·업무 테이블의 보편적 RLS 패턴: 직원은 `is_staff()` 기반 전체 SELECT/UPDATE/DELETE, 고객은 `is_my_company()` 기반 행 필터 SELECT, 쓰기는 직원 전용.

계정 생성은 셀프서비스가 아니라 admin 전용 `AccountManagementPage.jsx`(계정 관리)가 `admin-create-account`/`admin-reset-password` Edge Function(서비스롤 사용)을 호출하는 구조 — 별도 회원가입 라우트 없음.

`src/App.jsx`의 프론트엔드 게이팅 순서: ①세션 없으면 로그인 화면 → ②`staff_users`에 없거나 비활성이면 "접근 권한 없음" 화면(고객 계정이 사내 URL로 잘못 들어온 경우 등을 여기서 걸러냄) → ③`role==='admin'`이 아니면 `menuGroups`/`standaloneItems`의 `adminOnly` 항목이 메뉴에서 아예 제거됨(대표님 경영보고, 계정 관리) → ④비관리자 직원은 로그인 시 기본 페이지가 `sales`(관리자는 `daily`, 즉 CEO 보고).

`/separator`, `/portal`은 각자 자체 `*Gate.jsx`로 위 ①②에 해당하는 걸 따로 구현.

## 5. 페이지/메뉴 등록 규칙

- 새 사내 페이지는 `src/App.jsx`의 `menuGroups`(운영자/경리/대표님으로 그룹핑, role 라벨) 또는 `standaloneItems`(고객포털, 연구실, 계정관리처럼 그룹에 안 맞는 것)에 등록.
- **오성철강 연구실**(`src/pages/LabPage.jsx`)이 "아직 정식 기능은 아니지만 먼저 보여주는" 프로토타입의 정착지. `PROJECTS` 배열에 `{key, label, icon, category, desc, external?, badge?}` 한 줄만 추가하면 카테고리별로 자동 그룹핑되어 카드가 생김. `external`이 있으면 새 탭(정적 HTML), 없으면 이 페이지 안에서 인라인 렌더링(`src/pages/test/` 아래 컴포넌트).
- **내부 시스템 링크**(`src/pages/InternalSystemsPage.jsx`)는 `ERP2_SERVICES`(배포된 자체 서비스) / `INTERNAL_SYSTEMS`(사내 서버) / `EXTERNAL_SYSTEMS`(외부 업체) 3단 구성, 각각 `{icon, name, status, url, desc}` 배열을 공용 `SystemCard`로 렌더링.
- 스타일은 프레임워크 없이 파일 상단 `const C = {...}` 색상 상수 객체 + 인라인 `style={}` 패턴을 그대로 따름.

### 연구실(LabPage) 등록 현황 (카테고리별)

**주문접수 자동화**: 신규서비스 통합흐름(v2), OCR 문서인식, 카카오톡 주문접수, FAX 작업요청서 접수, 현장 코일확정.

**생산현장 도구** (가장 많음, 대부분 실데이터 연동): 세퍼레이터 셋팅 계산기/키오스크(현장 배포중), 작업현황 대시보드 1/2/3, 코일 작업 상세 분석, 레벨링 코일 상세분석·공정×ERP 통합 대시보드·공정 현황 모니터링·라인 통합 관제(NMS)·PLC 상세 조회·통합 타임라인·실시간 전체 데이터(HMI 미러), 테이퍼 텐션 컨트롤러 원격 모니터링(샘플)·데이터 수신 확인·**PR-DTC-3100 실시간 인식(상용, Groq)**·AI 인식 검증(개발용), 레벨링 작업 가이드(외국인 근로자용, 샘플), AI 헬퍼(슬리팅2 지난작업/작업용/모바일 한·영), Slitting2 Run Monitor(한·영), 슬리터1/2 작업 배정 변경(한·영), 작업 확인(거래처별 검색), 원자재 코일 검색(발주서 매칭).

**영업 지원**: 영업대상 고객사 리스트.

**고객사 시연**: 고객 주문 현황 트래커, (주)대한강재 챗봇.

**창고 관리**: 코일창고 3D 뷰어·출고관리(현장 배포중).

**설비 진단**: 장애 원인 분석(AI, 샘플).

**경영·재무**: 계좌 손익 통합 대시보드, 거래명세서 입금 확인.

**시스템 연동**: 대시보드 자동연동 모니터링.

## 6. 리포트/덱 생성 관례 (반복되는 요청 패턴)

이 프로젝트에서 "개발해줘"의 상당수는 실제로는 대표님 보고용 `.pptx`/`.docx` 산출물 제작이다(AX 전략 덱, 손익 보고서, 패치 이력 등). 워크스페이스 루트에 저장(`src/` 아님), `pptxgenjs` 기반 독립 Node 스크립트로 만들며 정해진 하우스 스타일을 따른다:

- `LAYOUT_WIDE` 13.33×7.5in, 고정 남색/황동색 팔레트, 헤더 `Cambria` + 본문 `Calibri`.
- 아이콘은 이모지 대신 react-icons를 `sharp`로 PNG 래스터화(이모지는 LibreOffice 변환 시 깨짐) — 공용 `iconCircle()`/`icon()` 헬퍼 사용.
- 슬라이드마다 JPEG로 렌더링(`soffice.py --convert-to pdf` + `pdftoppm`)해서 눈으로 확인 후 `validate.py`로 검증(pptxgenjs의 알려진 함정: 텍스트가 배열(run)일 때 `hyperlink`는 top-level `addText` 옵션이 아니라 run별로 설정해야 함 — 안 그러면 하이퍼링크 관계가 깨진 파일이 생김).

## 7. 개발 워크플로우 — MOCKUP FIRST (가장 중요한 규칙)

리포 폴더(`C:\Users\USER\Documents\개발\ohsung-system`) 안의 어떤 파일이든 코드를 한 줄이라도 쓰기 전에, 반드시 시각적 목업을 먼저 보여주고 명시적 승인을 받아야 한다. 이 규칙은:

- 완전히 새로운 화면/기능뿐 아니라, **이미 승인된 화면에 필드 추가·재디자인·"정보 더 보여줘" 같은 후속 요청에도 그대로 적용**된다("이미 승인된 것의 2단계"라는 이유로 예외가 되지 않음 — 렌더링 결과가 달라지면 새 목업이 필요).
- "그냥 만들어줘", "진행해줘" 같은 요청도 예외 없이 플랜+목업 절차를 다시 거쳐야 한다.
- 클래리파잉 질문에 답한 것은 디자인 승인이 아니다(범위만 좁혀줄 뿐).
- 진짜 승인 = 사용자가 실제 렌더링된 화면(visualize 도구, 스크린샷, 리포 밖 임시 HTML 등)을 보고 "그걸로 진행"이라고 명시적으로 말한 경우만 인정.

순서: ①채팅에 짧은 플랜(화면 구성, 데이터 출처, 대략적 레이아웃) → ②목업 렌더링(리포 안에 바로 쓰지 않고 스크래치/outputs에서, 목업 단계에서는 샘플/읽기전용 실데이터 사용 가능) → ③목업에 대한 명시적 승인 → ④그제서야 리포 파일 작성/편집, 승인된 범위 안에서만 새 테이블·쓰기·엣지함수·정합 로직 연결.

연구실(LabPage) 패턴은 승인된 프로토타입이 "정착하는 곳"이지, 목업을 먼저 보여주는 절차를 생략해도 되는 이유가 되지 않는다.

배포는 `main` 브랜치 push 시 Vercel이 처리 — 이 세션(샌드박스)엔 GitHub 자격증명이 없으므로, 커밋은 여기서 해도 `git push origin main`은 항상 사용자가 직접 실행해야 한다.

## 8. 관련 문서

- `PR-DTC-3100_OCR시스템_개발정리.md` — 이번에 만든 실시간 인식 시스템 상세.
- `PR-DTC-3100_로컬인식_전환검토.md` — Groq 없이 로컬로 전환하는 방안 검토(세그먼트 디코딩 등) + 레드팀 리스크 분석.
