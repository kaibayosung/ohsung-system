// src/pages/LabPage.jsx
// 오성철강 연구실 — AI 도입계획안에서 제안한 신규 기능(OCR 문서인식, 카카오톡 주문접수 채널,
// FAX 작업요청서 접수, 현장 코일확정 등)을 실제 개발 전에 UI로 먼저 보여주는 공간.
// 기존 '테스트' 메뉴를 대체합니다.
//
// 디자인: 카드형 대시보드. 프로젝트가 계속 늘어나도 PROJECTS 배열에 항목 하나만 추가하면
// 자동으로 카테고리에 맞는 카드가 생기는 구조라, 탭이 옆으로 계속 늘어나 복잡해지는 문제가 없습니다.
import React, { useState } from 'react';
import { COLORS } from './test/theme';
import { OcrDocumentIntake, KakaoOrderChannel, FaxJoborderIntake, FieldCoilConfirm, OrderFlowV2 } from './test/proposalScreens';
import { SeparatorSetupScreen } from './test/separatorSetup';
import { SalesTargetCustomerList } from './test/salesTargetScreen';
import { CustomerOrderTrackerScreen } from './test/customerOrderTrackerScreen';
import { CustomerChatbotScreen } from './test/customerChatbotScreen';
import { IncidentAnalysisSample } from './test/incidentAnalysisScreen';
import { CashFlowPnlDemo } from './test/cashFlowPnlScreen';
import { DepositReconcileDemo } from './test/depositReconcileScreen';
import { LevelerWorkStatus } from './test/levelerWorkStatusScreen';
import { CoilAnalysisScreen } from './test/coilAnalysisScreen';
import { CoilAiHelperScreen } from './test/coilAiHelperScreen';
import { CoilAiHelperWorkScreen } from './test/coilAiHelperWorkScreen';
import { WorkStatusBoardV2 } from './test/workStatusBoardV2Screen';
import { LevelingCoilDetailScreen } from './test/levelingCoilDetailScreen';
import { LevelingProcessDashboardScreen } from './test/levelingProcessDashboardScreen';
import { LevelingStrokeMonitorScreen } from './test/levelingStrokeMonitorScreen';
import { LevelingLineNmsScreen } from './test/levelingLineNmsScreen';
import { LevelingSummaryBoardScreen } from './test/levelingSummaryBoardScreen';
import { DashboardSyncMonitorScreen } from './test/dashboardSyncMonitorScreen';

// 새 프로젝트를 추가할 때는 여기에 한 줄만 더하면 됩니다 — category가 같으면 같은 섹션에 묶입니다.
// "생산현장 도구"처럼 항목이 많은 카테고리는 group으로 한 번 더 묶어서 보여줍니다(선택 사항).
// external을 채우면(별도 배포 URL이 있는 경우) 카드 클릭 시 새 탭으로 열리고, 없으면 이 페이지 안에서 바로 열립니다.
//
// [2026-09-29 재정리] "생산현장 도구"에 30개(전체의 68%)가 몰려 있어 6개 소분류(group)로 나누고,
// 분류 섹션 순서·소분류 순서·소분류 안의 서비스 순서를 모두 "최근에 만든 것이 위" 기준(git 최초
// 배포일)으로 재정렬했습니다. 목업 승인 내역은 대화 기록 참고.
const PROJECTS = [
  // ── 1. 생산현장 도구 (32개, 최신 10/6) ──────────────────────────────
  // 소분류: 입출고 · 재고 관제 (1개, 10/6)
  { key: 'ohsung-flow-hud', label: '입출고 · 재고 인사이트 관제 (홀로그램)', icon: '🛰️', category: '생산현장 도구', group: '입출고 · 재고 관제', desc: '입고→재고→가공→출고 흐름을 홀로그램 관제 화면 한 장으로 보여줍니다. 30일 일별 입출고·누적 순증감, 달력 히트맵, 월별 추이, 요일 패턴, 거래처 집중도(파레토), 재고 보관기간·두께 분포, 미출고 소진 예측, AI 인사이트와 챗봇 시연까지 포함합니다. 입출고·재고·미수는 2026-10-06 그린ERP 실데이터 스냅샷, 라인 가동·품질은 샘플입니다.', external: '/ohsung-flow-hud.html', badge: '실데이터 스냅샷', isNew: true },
  // 소분류: 슬리팅2 AI 헬퍼·모니터 (9개, 최신 9/29)
  { key: 'slitter2-stop-analysis-en', label: 'Slitting2 Stop Analysis (English)', icon: '⏸️', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: 'Pick a date to see that day’s Slitting2 job durations and mid-work stops as stats and charts, then click a job to open its full PLC time series. Real-data.', external: '/slitter2-stop-analysis-en.html', badge: '실데이터 연동', isNew: true },
  { key: 'slitter2-stop-analysis-kr', label: '슬리터2 정지 분석 (한국어)', icon: '⏸️', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: '날짜를 고르면 그날 슬리터2 전체 작업의 소요시간과 중간정지(설비가 RUN 상태에서 실제로 완전히 멈춘 구간) 건수·시간을 통계와 그래프로 보여줍니다. 작업을 클릭하면 해당 코일의 PLC 전 구간 시계열(속도·전류·텐션·지름·길이)이 열립니다. 실데이터로 동작합니다.', external: '/slitter2-stop-analysis-kr.html', badge: '실데이터 연동', isNew: true },
  { key: 'slitter2-monitor-kr', label: '슬리터2 운행 정보 모니터 (한국어)', icon: '🧵', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: '슬리터2 전 코일의 운행 정보를 모바일로 조회합니다. 날짜·코일을 고르고 길이 슬라이더를 움직이면 속도·텐션 등 모든 값이 해당 위치 기준으로 갱신됩니다. 실데이터로 동작합니다.', external: '/slitter2-monitor-kr.html', badge: '실데이터 연동' },
  { key: 'slitter2-monitor-en', label: 'Slitting2 Run Monitor (English)', icon: '🧵', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: 'Mobile monitor for foreign workers to browse every Slitting2 coil run — pick a date and coil, then drag the length slider to see speed, tension and every other reading update at that exact position.', external: '/slitter2-monitor-en.html', badge: '실데이터 연동' },
  { key: 'ai-helper-mobile-en', label: 'AI Helper Mobile (English)', icon: '📱', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: 'English version of the mobile AI Helper for the field — same real-time recommendations and live speed/tension comparison.', external: '/ai-helper-mobile-en.html', badge: '실데이터 연동' },
  { key: 'ai-helper-mobile-kr', label: 'AI 헬퍼 모바일 (한국어)', icon: '📱', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: '현장에서 폰으로 바로 보는 AI 헬퍼. 코일 상태(준비/가동중/완료)에 따라 예상 프리뷰 또는 실시간 속도·4존 텐션 비교를 자동으로 보여줍니다. 실데이터로 동작합니다.', external: '/ai-helper-mobile-kr.html', badge: '실데이터 연동' },
  { key: 'coil-ai-helper-work', label: 'AI 헬퍼 (슬리팅 2/작업용)', icon: '🎯', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: '코일을 선택하면 현재 진행 길이의 실측 속도·텐션1~4를 동일 사양 완료 코일 권장치와 비교해 적정/느림/빠름을 보여줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'coil-ai-helper', label: 'AI 헬퍼 (슬리팅 2/지난작업보기)', icon: '🤖', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: '가동 전 작업지시서를 선택하면 동일 사양 완료 코일들의 실측 데이터로 권장 속도·텐션·예상 가동시간을 추천합니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'coil-analysis', label: '코일 작업 상세 분석', icon: '🧭', category: '생산현장 도구', group: '슬리팅2 AI 헬퍼 · 모니터', desc: '날짜·코일을 선택하면 길이 구간별 속도·텐션 변화와 동일 사양 대비 편차를 보여줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  // 소분류: 테이퍼 텐션 원격 인식 (5개, 최신 9/2)
  { key: 'ai-tension-monitor', label: 'PR-DTC-3100 실시간 인식 (상용)', icon: '📡', category: '생산현장 도구', group: '테이퍼 텐션 원격 인식', desc: '폰 IP카메라 스트림을 개발서버의 ocr_monitor_production.py가 1분마다 Groq(Qwen3.8-27B)로 인식해 ai_tension_readings 테이블에 저장합니다. 출력%·전압·두께·시작경·장력설정·장력율 6개 값과 누적 현황, 최근 6시간 수신 커버리지, 최근 저장 레코드를 8초마다 갱신해 보여줍니다.', external: '/ai-tension-monitor.html', badge: '실데이터 연동' },
  { key: 'ai-recognition-validation', label: 'AI 인식 검증 (개발용)', icon: '🧪', category: '생산현장 도구', group: '테이퍼 텐션 원격 인식', desc: '카메라 배포 전, 이미 확보한 PR-DTC-3100 사진 폴더를 선택하면 브라우저에서 직접 Groq(Qwen3.8-27B)를 호출해 값을 인식하고 사진과 나란히 비교합니다. 결과는 ai_recognition_validation_log 테이블에도 누적 저장됩니다.', external: '/ai-recognition-validation.html', badge: '개발용' },
  { key: 'taper-tension-ingestion-status', label: '테이퍼 텐션 데이터 수신 확인', icon: '📶', category: '생산현장 도구', group: '테이퍼 텐션 원격 인식', desc: 'taper_tension_readings 테이블에 OCR 값이 실시간으로 계속 쌓이고 있는지 8초마다 확인합니다. 누적/오늘 저장 건수, 최근 6시간 수신 커버리지, 저신뢰도 비율, 최근 레코드를 보여줍니다. 테이블·조회 권한은 준비됐고, 카메라·ocr_monitor.py 연결 전까지는 대기 상태로 표시됩니다.', external: '/taper-tension-ingestion-status.html', badge: '실데이터 연동' },
  { key: 'taper-tension-guide', label: '레벨링 작업 가이드 (외국인 근로자용)', icon: '🧭', category: '생산현장 도구', group: '테이퍼 텐션 원격 인식', desc: '작업일자·작업지시서를 고르면 코일 길이 진행에 따라 텐션 설정값을 어떻게 낮춰야 하는지, PLC 속도·사이클타임은 어떤지 큰 숫자로 보여줍니다. 아직 실측 연동 전이라 예시 데이터입니다.', external: '/taper-tension-guide.html', badge: '샘플' },
  { key: 'taper-tension-monitor', label: '테이퍼 텐션 컨트롤러 원격 모니터링', icon: '📟', category: '생산현장 도구', group: '테이퍼 텐션 원격 인식', desc: '통신 포트가 없는 PR-DTC-3100 LCD를 카메라+OCR로 읽어 값을 뽑아내고, 외국인 운영자 대신 관리자가 폰으로 원격 확인·조치합니다. 카메라 거치 전 단계라 샘플 데이터입니다.', external: '/taper-tension-monitor.html', badge: '샘플' },
  // 소분류: 현장 조회 · 배정 도구 (4개, 최신 9/1)
  { key: 'coil-inventory-search', label: '원자재 코일 검색 (발주서 매칭)', icon: '🔍', category: '생산현장 도구', group: '현장 조회 · 배정 도구', desc: '발주서에 적힌 거래처명·두께로 오성철강에 입고된 재고 코일을 찾아 작업에 쓸 코일을 고릅니다. 모바일 카드 화면, 조회/참고용이며 실데이터(그린ERP 재고)로 동작합니다.', external: '/coil-inventory-search.html', badge: '실데이터 연동' },
  { key: 'work-status-lookup', label: '작업 확인 (거래처별 검색)', icon: '📞', category: '생산현장 도구', group: '현장 조회 · 배정 도구', desc: '기사님 전화 응대용 — 거래처명을 입력하면 레벨링·슬리터1·슬리터2 전체에서 코일ID/가공규격/무게/작업일자/작업여부를 최근순으로 찾아줍니다. 실데이터로 동작합니다.', external: '/work-status-lookup.html', badge: '실데이터 연동' },
  { key: 'slitter-line-swap-en', label: 'Slitter 1/2 Assignment Swap (English)', icon: '🔀', category: '생산현장 도구', group: '현장 조회 · 배정 도구', desc: 'Swap a ready work order between Slitter 1 and Slitter 2. Search by coil ID, filter by line, and see recent changes — writes directly to the live line assignment.', external: '/slitter-line-swap-en.html', badge: '실데이터 연동' },
  { key: 'slitter-line-swap-kr', label: '슬리터1/2 작업 배정 변경 (한국어)', icon: '🔀', category: '생산현장 도구', group: '현장 조회 · 배정 도구', desc: '준비(미가동) 상태인 작업지시서를 골라 슬리터1↔슬리터2 라인 배정을 바꿉니다. 코일ID 검색, 라인 탭, 변경 이력을 지원하며 현장 공유용 링크로 실데이터에 바로 반영됩니다.', external: '/slitter-line-swap-kr.html', badge: '실데이터 연동' },
  // 소분류: 레벨링 모니터링 (9개, 최신 10/2)
  { key: 'leveling-realtime-hmi', label: '레벨링 실시간 전체 데이터 (HMI 미러)', icon: '🖥️', category: '생산현장 도구', group: '레벨링 모니터링', desc: '레벨러 현장 HMI(초기운전화면) 실측 영상과 대조해 매핑한 LEVELING_DATA 테이블 19개 컬럼 전체를 5초마다 그대로 보여줍니다. P17 등 PLC 알람·인터록 코드는 현재 구조상 미수집이라 표시되지 않습니다.', external: '/leveling-realtime-hmi.html', badge: '실데이터 연동' },
  { key: 'leveling-integrated-timeline', label: '레벨링 통합 타임라인', icon: '🧩', category: '생산현장 도구', group: '레벨링 모니터링', desc: '작업일자·코일을 고르면 ERP 작업지시서(거래처·사양·중량), 박스별 진행 간트, 가동률·변동계수 게이지, PLC 설정값, 사이클타임·속도 그래프, 이상 행정을 한 화면에서 시간순으로 봅니다. leveler-explore 실측 데이터. 텐션(DTC-3100)은 카메라 배포 후 연동 예정.', external: '/leveling-integrated-timeline.html', badge: '실데이터 연동' },
  { key: 'leveling-plc-viewer', label: '레벨링 PLC 상세 조회', icon: '📡', category: '생산현장 도구', group: '레벨링 모니터링', desc: '코일(박스)을 선택하면 절단길이·가감속시간·행정별 사이클타임·속도(MPM)를 leveler-explore 실측 데이터 그대로 보여줍니다. DTC-3100 텐션값은 다음 단계에서 추가 예정.', external: '/leveling-plc-viewer.html', badge: '실데이터 연동' },
  { key: 'leveling-line-nms', label: '레벨링 라인 통합 관제 (NMS)', icon: '🛰️', category: '생산현장 도구', group: '레벨링 모니터링', desc: 'ERP 작업지시서와 PLC 실측 텔레메트리를 관제센터 스타일 한 화면에 실시간으로 엮습니다. 라인 상태·진행률·라이브 파형·이상 알림·금일 타임라인을 20초 자동 갱신으로 보여줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'leveling-summary-board', label: '레벨링 종합 현황판', icon: '🎚️', category: '생산현장 도구', group: '레벨링 모니터링', desc: 'ERP 작업지시서 × PLC 실측 × 텐션 OCR 데이터를 설비 흐름도(언코일러→레벨러→루프→샤링기→컨베이어) 위에 얹어 한 화면으로 요약해서 보여줍니다. 루프·샤링기·컨베이어는 개별 계측기가 없어 라인 가동 상태만 함께 표시합니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'leveling-stroke-monitor', label: '레벨링 공정 현황 모니터링', icon: '🧭', category: '생산현장 도구', group: '레벨링 모니터링', desc: '레벨링 PLC 행정(stroke) 로그를 코일·박스별 실시간 현황 → 절단 사양·이상행정 상세 → 변동계수·저속비율 등 통계 인사이트까지 3단계로 드릴다운합니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'leveling-process-dashboard', label: '레벨링 공정×ERP 통합 대시보드', icon: '🏭', category: '생산현장 도구', group: '레벨링 모니터링', desc: '하루치 레벨링 작업의 ERP 사양·가동 타임라인·부하율 비교·공정 리듬(이상 구간 탐지)·그린ERP 매출 동기화 여부를 한 화면에 모읍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'leveling-coil-detail', label: '레벨링 코일 상세분석', icon: '🧭', category: '생산현장 도구', group: '레벨링 모니터링', desc: '레벨링 라인에 코일ID가 태깅된 작업을 날짜·코일로 선택하면 시트 수 추정, 길이 정확도, 설비 부하, 박스별 현황을 보여줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'leveling-coil-select', label: '레벨링 코일 선택 (DB 연동)', icon: '🧲', category: '생산현장 도구', group: '레벨링 모니터링', desc: '오늘자 LEVELLING 작업지시서를 leveler-explore(leveling_work_orders 모드)에서 실시간으로 불러와 코일을 고릅니다. 외부 레벨러 패드(osungsteel.servehttp.com/pad/leveling)의 "박스 1/2/3/4" 선택이 150/200/200/308장 세트와 안 맞아 헷갈리던 문제를 풀기 위해 새로 개발 중인 화면의 1단계이며, 조회만 하고 DB에 쓰지는 않습니다. 실데이터로 동작합니다.', external: '/leveling-coil-select.html', badge: '실데이터 연동', isNew: true },
  // 소분류: 작업현황 대시보드 (3개, 최신 8/12)
  { key: 'work-status-board-3', label: '작업현황 대시보드 3', icon: '🗓️', category: '생산현장 도구', group: '작업현황 대시보드', desc: '레벨링·슬리팅2·슬리팅1을 라인별 카드로 보여주는 반응형(PC/모바일) 대시보드입니다. 날짜 선택, 완료/작업중/예정 구분, 진행률 링, 오늘 완료 가능 예측을 실데이터로 보여줍니다. 로그인 없이 링크로 바로 열 수 있어 대표님도 접속해 볼 수 있습니다.', external: '/work-status-3.html', badge: '실데이터 연동' },
  { key: 'work-status-board-2', label: '작업현황 대시보드 2', icon: '🗂️', category: '생산현장 도구', group: '작업현황 대시보드', desc: '레벨링·슬리팅2·슬리팅1을 라인별 보드로 보고, 라인마다 오늘 번 금액과 남은 작업을 오늘 안에 끝낼 수 있는지(평균 소요시간 기반 예측)까지 확인합니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'leveler-work-status', label: '작업현황 대시보드', icon: '📊', category: '생산현장 도구', group: '작업현황 대시보드', desc: '레벨러 시스템(레벨링·슬리팅1·슬리팅2) 작업현황을 날짜별로 봅니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  // 소분류: 세퍼레이터 (2개, 최신 7/27)
  { key: 'separator-kiosk', label: '세퍼레이터 태블릿 키오스크', icon: '🖥️', category: '생산현장 도구', group: '세퍼레이터', desc: '슬리터2 현장에 배포된 실제 서비스로 이동합니다.', external: '/separator', badge: '현장 배포중' },
  { key: 'separator-setup', label: '세퍼레이터 셋팅 계산기', icon: '📐', category: '생산현장 도구', group: '세퍼레이터', desc: '가공규격에 맞춰 스페이서 조합을 자동 계산합니다. (사무실용)' },

  // ── 2. 통합 챗봇 (테스트) (1개, 9/28) ──────────────────────────────
  { key: 'ceo-chatbot-groq-test', label: '대표님 통합조회 챗봇 (Groq 테스트)', icon: '🤖', category: '통합 챗봇 (테스트)', desc: '작업지시서·생산실적·입출고·재고·미출고·미수금·대시보드 자동연동(그린ERP 미러)은 물론 레벨링·슬리팅 PLC 실측(속도·텐션·사이클타임)과 레벨러 시스템 자체 작업이력까지 자연어로 물어보면, Claude 대신 Groq(Qwen3.8-27B)가 tool-calling으로 필요한 테이블/DB를 직접 조회해서 답합니다. 비용·속도·답변품질을 비교해보는 프로토타입입니다.', external: '/ceo-chatbot-groq-test.html', badge: '실데이터 연동' },

  // ── 3. 시스템 연동 (1개, 8/31) ──────────────────────────────────
  { key: 'dashboard-sync-monitor', label: '대시보드 자동연동 모니터링', icon: '🔗', category: '시스템 연동', desc: '그린ERP 작업지시서를 슬리팅 대시보드(servehttp.com)에 자동 등록하는 dashboard-instant-sync(RPA 대체)가 정상 동작 중인지, 오늘 몇 건이 자동 등록됐는지 실시간으로 보여줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },

  // ── 4. 고객사 시연 (2개, 최신 8/9) ──────────────────────────────
  { key: 'customer-chatbot', label: '(주)대한강재 챗봇 (작업 현황·미수금·출고 여부)', icon: '💬', category: '고객사 시연', desc: '진행중/완료 건수, 미출고, 미수금, 코일별 상태 등을 자유롭게 물어보면 Claude가 실데이터를 근거로 자연어로 답합니다. 실제 /portal과 별개, 대한강재로 범위 고정.', badge: '실데이터 연동' },
  { key: 'customer-order-tracker', label: '고객 주문 현황 트래커', icon: '📦', category: '고객사 시연', desc: '거래처를 선택하면 접수·작업지시·작업진행·작업완료·출고완료 5단계 진행상황을 한눈에 보여줍니다. 실제 /portal과 별개의 외부 시연용 프로토타입, 실데이터로 동작합니다.', badge: '실데이터 연동' },

  // ── 5. 경영 · 재무 (2개, 최신 7/31) ──────────────────────────────
  { key: 'deposit-reconcile', label: '거래명세서 입금 확인', icon: '🧾', category: '경영 · 재무', desc: '기간을 정하고 매출 거래명세서 + 통장 거래내역 엑셀을 올리면 금액·거래처·시기를 맞춰 입금 여부를 자동 분류합니다. 장기 미입금 건만 따로 걸러볼 수 있습니다.' },
  { key: 'cashflow-pnl', label: '계좌 손익 통합 대시보드', icon: '💰', category: '경영 · 재무', desc: '통장 거래내역을 업로드하면 그린ERP 매출(가공+고철)과 합쳐 월간 손익을 자동 계산합니다. 매출은 실데이터, 통장 내역은 화면에서만 계산(미저장)됩니다.', badge: '실데이터 연동' },

  // ── 6. 창고 관리 (1개, 7/29) ──────────────────────────────────
  { key: 'warehouse-3d', label: '코일창고 3D 뷰어 · 출고관리', icon: '📦', category: '창고 관리', desc: '거래처별 보관 코일을 3D/평면도로 보고, 출고 처리까지 할 수 있는 실제 배포 서비스입니다.', external: '/warehouse-3d.html', badge: '현장 배포중' },

  // ── 7. 설비 진단 (1개, 7/29) ──────────────────────────────────
  { key: 'incident-analysis', label: '장애 원인 분석 (AI)', icon: '🧯', category: '설비 진단', desc: 'PLC 이력·CCTV 데이터를 AI가 분석해 사고 원인을 30분 내로 규명합니다. 실제 슬리터 사고 사례로 만든 샘플입니다.', badge: '샘플' },

  // ── 8. 영업 지원 (1개, 7/28) ──────────────────────────────────
  { key: 'sales-target', label: '영업대상 고객사 리스트', icon: '📋', category: '영업 지원', desc: '재고를 맡겨둔 거래처 중 최근 작업이 뜸한 곳을 자동으로 찾아줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },

  // ── 9. 주문접수 자동화 (5개, 가장 오래된 분류 · 최신 7/26) ──────────────
  { key: 'order-flow-v2', label: '신규서비스 통합흐름 (v2)', icon: '🔄', category: '주문접수 자동화', desc: '접수부터 배차·코일확정까지 전체 흐름을 한 화면에서 봅니다.' },
  { key: 'field-confirm', label: '현장 코일확정', icon: '🚜', category: '주문접수 자동화', desc: '지게차 기사가 태블릿에서 코일을 확정합니다.' },
  { key: 'fax-joborder', label: 'FAX 작업요청서 접수', icon: '📠', category: '주문접수 자동화', desc: '팩스로 온 작업요청서를 자동 인식해 초안을 만듭니다.' },
  { key: 'kakao', label: '카카오톡 주문접수', icon: '💬', category: '주문접수 자동화', desc: '카카오톡 채널로 들어온 주문을 자동 접수합니다.' },
  { key: 'ocr', label: 'OCR 문서인식', icon: '📄', category: '주문접수 자동화', desc: '주문서 이미지에서 텍스트를 자동으로 읽어냅니다.' },
];

// 분류(category)마다 아이콘·강조색을 부여해 홈 화면에서 한눈에 구분되게 합니다.
// (기존 COLORS 토큰을 최대한 재사용하고, 없는 색만 새로 추가했습니다.)
const CATEGORY_META = {
  '생산현장 도구': { icon: '🏭', accent: '#0e7c7b', accentBg: '#e3f4f3' },
  '통합 챗봇 (테스트)': { icon: '🤖', accent: '#6b4fa0', accentBg: '#efe9f9' },
  '시스템 연동': { icon: '🔗', accent: COLORS.blue, accentBg: COLORS.blueBg },
  '고객사 시연': { icon: '🎤', accent: '#a83e6b', accentBg: '#f8e8f0' },
  '경영 · 재무': { icon: '💰', accent: COLORS.amber, accentBg: COLORS.amberBg },
  '창고 관리': { icon: '📦', accent: '#c15a1f', accentBg: '#fbe9db' },
  '설비 진단': { icon: '🧯', accent: COLORS.red, accentBg: COLORS.redBg },
  '영업 지원': { icon: '📋', accent: COLORS.green, accentBg: COLORS.greenBg },
  '주문접수 자동화': { icon: '📥', accent: COLORS.steelLight, accentBg: COLORS.bg },
};

// "생산현장 도구" 내부 소분류(group)마다 붙이는 작은 아이콘.
const GROUP_ICONS = {
  '입출고 · 재고 관제': '🛰️',
  '슬리팅2 AI 헬퍼 · 모니터': '🤖',
  '테이퍼 텐션 원격 인식': '📟',
  '현장 조회 · 배정 도구': '🔍',
  '레벨링 모니터링': '📡',
  '작업현황 대시보드': '📊',
  '세퍼레이터': '📐',
};

// 카드 배지(badge) 문구별 색상 — 데이터 상태를 한눈에 구분합니다.
const BADGE_COLORS = {
  '실데이터 연동': { bg: COLORS.greenBg, color: COLORS.green },
  '실데이터 스냅샷': { bg: COLORS.blueBg, color: COLORS.blue },
  '현장 배포중': { bg: COLORS.blueBg, color: COLORS.blue },
  '샘플': { bg: COLORS.amberBg, color: COLORS.amber },
  '개발용': { bg: '#efe9f9', color: '#6b4fa0' },
};

// FAX 작업요청서 접수(No.13-1)와 현장 코일확정(No.13-2)은 하나의 흐름(초안 → 배차대기 → 배정완료)을
// 공유하므로, 두 화면이 같은 draft 목록을 보도록 상태를 여기서 관리합니다.
// 실제 개발 시에는 이 배열이 ERP2.0의 작업지시서 초안 테이블로 대체됩니다.
const INITIAL_JOBORDER_DRAFTS = [
  {
    id: 1, customer_name: '(주)대한강재', material: 'SGCC 0.75T', spec: '0.75 X 4 X C',
    qty_weight: '9,800', work_type: '슬리팅', due_date: '2026-07-27',
    source: 'FAX', sourceDoc: '작업요청서_대한강재_0725.jpg', confidence: 97,
    status: '배차대기', assigned_coil_id: null,
  },
];

function groupByCategory(items) {
  const order = [];
  const map = new Map();
  items.forEach((item) => {
    if (!map.has(item.category)) {
      map.set(item.category, []);
      order.push(item.category);
    }
    map.get(item.category).push(item);
  });
  return order.map((name) => ({ name, items: map.get(name) }));
}

// 카테고리 안을 한 번 더 group 필드로 묶습니다("생산현장 도구"처럼 항목이 많은 분류용).
// group이 없는 항목은 하나로 묶여 카테고리 헤더 아래 바로 카드 그리드로 나옵니다.
function groupByGroup(items) {
  const order = [];
  const map = new Map();
  items.forEach((item) => {
    const key = item.group || '';
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key).push(item);
  });
  return order.map((name) => ({ name, items: map.get(name) }));
}

// [딥링크] App.jsx가 ?lab=<키> 를 보고 currentPage를 'lab'로 보내주면, 여기서 같은 쿼리값을
// 읽어 곧바로 해당 프로젝트 화면을 연 상태로 시작합니다. 예: /?lab=sales-target
function getDeepLinkView() {
  try {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('lab');
    if (key && PROJECTS.some((p) => p.key === key && !p.external)) return key;
  } catch { /* URLSearchParams 미지원 환경 방어 */ }
  return 'home';
}

// 서비스 카드 하나. badge 문구에 맞는 색을 BADGE_COLORS에서 찾고, isNew면 "NEW" 표시를 덧붙입니다.
function ProjectCard({ p, onOpen }) {
  const badgeStyle = p.badge ? (BADGE_COLORS[p.badge] || { bg: COLORS.greenBg, color: COLORS.green }) : null;
  return (
    <div className="op-project-card" style={styles.projectCard} onClick={() => onOpen(p)}>
      <div style={styles.cardIconWrap}>{p.icon}</div>
      <div style={styles.cardBody}>
        <div style={styles.cardTitleRow}>
          <span style={styles.cardTitle}>{p.label}</span>
          {p.isNew && <span style={styles.cardBadgeNew}>NEW</span>}
          {p.badge && (
            <span style={{ ...styles.cardBadge, backgroundColor: badgeStyle.bg, color: badgeStyle.color }}>
              {p.badge}
            </span>
          )}
        </div>
        <div style={styles.cardDesc}>{p.desc}</div>
      </div>
      <div style={styles.cardArrow}>{p.external ? '↗' : '→'}</div>
    </div>
  );
}

function LabPage() {
  const [view, setView] = useState(getDeepLinkView); // 'home' | PROJECTS[].key (딥링크 있으면 그 화면)
  const [joborderDrafts, setJoborderDrafts] = useState(INITIAL_JOBORDER_DRAFTS);

  const createDraft = (payload) => {
    setJoborderDrafts((prev) => [
      ...prev,
      { id: Date.now(), status: '초안', assigned_coil_id: null, ...payload },
    ]);
  };
  const approveDraft = (id) => {
    setJoborderDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: '배차대기' } : d)));
  };
  const confirmCoil = (id, coilId, driverName) => {
    setJoborderDrafts((prev) => prev.map((d) => (d.id === id ? {
      ...d, status: '배정완료', assigned_coil_id: coilId,
      assigned_driver_name: driverName || null, confirmed_at: new Date().toISOString(),
    } : d)));
  };

  const openProject = (p) => {
    if (p.external) {
      window.open(p.external, '_blank', 'noopener');
      return;
    }
    setView(p.key);
  };

  const current = PROJECTS.find((p) => p.key === view) || null;
  const categories = groupByCategory(PROJECTS);

  return (
    <div style={styles.container}>
      <div style={styles.banner}>
        <span style={styles.bannerIcon}>🔬</span>
        <span>오성철강 연구실 — AI 도입계획안에서 제안한 신규 기능을 실제 개발 전에 UI로 먼저 체험해보는 공간입니다. 아래 화면들은 샘플 데이터로 동작하는 프로토타입입니다.</span>
      </div>

      {view === 'home' ? (
        <div style={styles.home}>
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat.name] || {};
            const isProductionTools = cat.name === '생산현장 도구';
            const subgroups = isProductionTools ? groupByGroup(cat.items) : null;
            return (
              <div key={cat.name} style={{ ...styles.section, borderLeft: `4px solid ${meta.accent || COLORS.border}` }}>
                <div style={styles.sectionTitleRow}>
                  <span style={{ ...styles.sectionIconWrap, backgroundColor: meta.accentBg || COLORS.bg }}>{meta.icon}</span>
                  <span style={styles.sectionTitle}>{cat.name}</span>
                  <span style={styles.sectionCount}>{cat.items.length}개</span>
                </div>

                {isProductionTools ? (
                  <div style={styles.subgroupStack}>
                    {subgroups.map((g) => (
                      <div key={g.name || cat.name} style={styles.subgroupBlock}>
                        <div style={styles.subgroupTitle}>
                          <span>{GROUP_ICONS[g.name] || '•'}</span>
                          <span>{g.name}</span>
                          <span style={styles.subgroupCount}>{g.items.length}개</span>
                        </div>
                        <div style={styles.cardGrid}>
                          {g.items.map((p) => (
                            <ProjectCard key={p.key} p={p} onOpen={openProject} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.cardGrid}>
                    {cat.items.map((p) => (
                      <ProjectCard key={p.key} p={p} onOpen={openProject} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={styles.backBar}>
            <button className="op-nav-btn" style={styles.backBtn} onClick={() => setView('home')}>← 연구실 홈</button>
            {current && (
              <span style={styles.backBarTitle}>{current.icon} {current.label}</span>
            )}
          </div>

          {view === 'ocr' && <OcrDocumentIntake />}
          {view === 'kakao' && <KakaoOrderChannel />}
          {view === 'fax-joborder' && (
            <FaxJoborderIntake drafts={joborderDrafts} onCreateDraft={createDraft} onApprove={approveDraft} />
          )}
          {view === 'field-confirm' && (
            <FieldCoilConfirm drafts={joborderDrafts} onConfirmCoil={confirmCoil} />
          )}
          {view === 'order-flow-v2' && (
            <OrderFlowV2 drafts={joborderDrafts} onCreateDraft={createDraft} onApprove={approveDraft} onConfirmCoil={confirmCoil} />
          )}
          {view === 'separator-setup' && <SeparatorSetupScreen />}
          {view === 'sales-target' && <SalesTargetCustomerList />}
          {view === 'customer-order-tracker' && <CustomerOrderTrackerScreen />}
          {view === 'customer-chatbot' && <CustomerChatbotScreen />}
          {view === 'incident-analysis' && <IncidentAnalysisSample />}
          {view === 'cashflow-pnl' && <CashFlowPnlDemo />}
          {view === 'deposit-reconcile' && <DepositReconcileDemo />}
          {view === 'leveler-work-status' && <LevelerWorkStatus />}
          {view === 'work-status-board-2' && <WorkStatusBoardV2 />}
          {view === 'leveling-coil-detail' && <LevelingCoilDetailScreen />}
          {view === 'leveling-process-dashboard' && <LevelingProcessDashboardScreen />}
          {view === 'leveling-stroke-monitor' && <LevelingStrokeMonitorScreen />}
          {view === 'leveling-line-nms' && <LevelingLineNmsScreen />}
          {view === 'leveling-summary-board' && <LevelingSummaryBoardScreen />}
          {view === 'coil-analysis' && <CoilAnalysisScreen />}
          {view === 'coil-ai-helper' && <CoilAiHelperScreen />}
          {view === 'coil-ai-helper-work' && <CoilAiHelperWorkScreen />}
          {view === 'dashboard-sync-monitor' && <DashboardSyncMonitorScreen />}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '28px 36px', backgroundColor: COLORS.bg, minHeight: '100vh' },
  banner: {
    background: COLORS.navyGradient, color: '#c8d3e2', padding: '18px 24px', borderRadius: '14px',
    fontSize: '14px', lineHeight: 1.6, marginBottom: '26px', display: 'flex', gap: '12px', alignItems: 'flex-start',
    boxShadow: COLORS.shadowMd,
  },
  bannerIcon: { fontSize: '18px', flexShrink: 0 },

  home: { display: 'flex', flexDirection: 'column', gap: '22px' },
  section: {
    backgroundColor: COLORS.white, borderRadius: '16px', padding: '18px 22px 22px',
    boxShadow: COLORS.shadowSm,
  },
  sectionTitleRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' },
  sectionIconWrap: {
    width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '16px', flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '18px', fontWeight: 800, color: COLORS.navy, letterSpacing: '-0.01em',
  },
  sectionCount: { fontSize: '13px', color: COLORS.steelLight, fontWeight: 700, marginLeft: '2px' },

  subgroupStack: { display: 'flex', flexDirection: 'column', gap: '14px' },
  subgroupBlock: {
    backgroundColor: COLORS.bg, borderRadius: '12px', padding: '14px 16px',
  },
  subgroupTitle: {
    display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: 800,
    color: COLORS.steel, marginBottom: '10px',
  },
  subgroupCount: { fontSize: '12px', color: COLORS.steelLight, fontWeight: 700 },

  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' },
  projectCard: {
    display: 'flex', alignItems: 'flex-start', gap: '16px', backgroundColor: COLORS.white,
    border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '20px 20px 20px 18px',
    cursor: 'pointer', boxShadow: COLORS.shadowSm,
  },
  cardIconWrap: {
    width: '48px', height: '48px', borderRadius: '13px', backgroundColor: COLORS.accentSoft,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' },
  cardTitle: { fontSize: '17px', fontWeight: 800, color: COLORS.navy },
  cardBadge: {
    fontSize: '11px', fontWeight: 800, color: COLORS.green, backgroundColor: COLORS.greenBg,
    padding: '3px 9px', borderRadius: '999px', letterSpacing: '0.01em',
  },
  cardBadgeNew: {
    fontSize: '11px', fontWeight: 800, color: '#ffffff', backgroundColor: COLORS.red,
    padding: '3px 9px', borderRadius: '999px', letterSpacing: '0.02em',
  },
  cardDesc: { fontSize: '14px', color: COLORS.steelLight, lineHeight: 1.5 },
  cardArrow: { fontSize: '18px', color: COLORS.steelLight, flexShrink: 0, marginTop: '4px' },

  backBar: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' },
  backBtn: {
    padding: '11px 20px', borderRadius: '11px', border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.white, color: COLORS.steel, fontWeight: 700, fontSize: '15px',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  backBarTitle: { fontSize: '20px', fontWeight: 800, color: COLORS.navy },
};

export default LabPage;
