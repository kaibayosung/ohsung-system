/**
 * PR-DTC-3100 텐션 컨트롤러 화면 글자 인식 (구글 문서 OCR) — Apps Script 웹 앱
 * ---------------------------------------------------------------------------
 * 판독 PC(ocr_monitor_production.py)가 찍은 사진을 POST로 보내면,
 * 구글 드라이브에서 임시 구글 문서로 변환(OCR)해 글자를 뽑아 돌려주고
 * 임시 문서는 바로 지운다. 사진 원본은 드라이브에 남기지 않는다
 * (사진은 판독 PC captures 폴더에 14일 보관됨).
 *
 * 2026-11-27 멘토링 제안 코드(doGet + 드라이브 폴더 탐색)를 바탕으로,
 * 폴더 업로드(rclone)·시각 탐색 단계를 빼고 사진을 직접 받도록 바꿈.
 *
 * 설정 (처음 한 번)
 *  1) 서비스(+) → Drive API, 버전 v3, 식별자 Drive
 *  2) 프로젝트 설정 → 시간대 Asia/Seoul
 *  3) 비밀키(OCR_KEY)는 판독 PC가 첫 호출 때 자동 등록 (getOrRegisterKey_)
 *  4) authTest 실행 → 권한 승인
 *  5) 배포 → 새 배포 → 웹 앱: 실행 계정 "나", 액세스 "모든 사용자"
 *     (판독 PC가 로그인 없이 호출해야 하므로. 대신 OCR_KEY가 맞아야만 동작)
 */

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function doPost(e) {
  const t0 = Date.now();
  let docId = null;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const key = getOrRegisterKey_(body);
    if (!key || body.key !== key) return out_({ ok: false, error: 'unauthorized' });
    if (!body.image) return out_({ ok: false, error: 'no image' });

    const bytes = Utilities.base64Decode(body.image);
    if (bytes.length > MAX_IMAGE_BYTES) return out_({ ok: false, error: 'image too large: ' + bytes.length });
    const blob = Utilities.newBlob(bytes, 'image/jpeg', 'dtc_' + t0 + '.jpg');

    const doc = Drive.Files.create(
      { name: 'temp_dtc_ocr_' + t0, mimeType: MimeType.GOOGLE_DOCS },
      blob,
      { ocrLanguage: body.lang || 'ko', fields: 'id' }
    );
    docId = doc.id;
    // 줄바꿈은 그대로 둔다 (항목 분리 규칙에 줄 정보가 필요)
    const text = DocumentApp.openById(docId).getBody().getText().trim();
    return out_({ ok: !!text, text: text, ms: Date.now() - t0, error: text ? null : 'empty OCR result' });
  } catch (err) {
    console.error(String(err));
    return out_({ ok: false, error: String(err).slice(0, 300), ms: Date.now() - t0 });
  } finally {
    if (docId) {
      try { Drive.Files.remove(docId); } catch (err) { console.error('cleanup failed: ' + docId); }
    }
  }
}

/** 브라우저로 웹 앱 주소를 열면 살아있는지만 알려준다 (사진 처리 없음). */
function doGet() {
  return out_({ ok: true, service: 'pr-dtc-ocr', time: new Date().toISOString() });
}

/**
 * 비밀키: 판독 PC가 처음 보낸 키(register:true, 24자 이상)를 한 번만 등록하고 그 뒤로는 바꾸지 않는다.
 * (키를 사람이 옮겨 적지 않도록 — 판독 PC가 키를 만들어 첫 호출 때 등록)
 * 키를 바꾸려면 프로젝트 설정 > 스크립트 속성에서 OCR_KEY를 지우고 판독 PC의 키를 새로 만든다.
 */
function getOrRegisterKey_(body) {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('OCR_KEY');
  if (key) return key;
  if (!body.register || !body.key || String(body.key).length < 24) return null;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    key = props.getProperty('OCR_KEY');
    if (!key) { props.setProperty('OCR_KEY', String(body.key)); key = String(body.key); }
  } finally { lock.releaseLock(); }
  return key;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 처음 한 번 실행해서 드라이브·문서 권한을 승인한다. */
function authTest() {
  const blob = Utilities.newBlob('auth test', 'text/plain', 'auth.txt');
  const f = Drive.Files.create({ name: 'temp_dtc_auth_test', mimeType: MimeType.GOOGLE_DOCS }, blob, { fields: 'id' });
  const text = DocumentApp.openById(f.id).getBody().getText();
  Drive.Files.remove(f.id);
  Logger.log('권한 OK: ' + text);
  Logger.log('OCR_KEY 설정됨: ' + !!PropertiesService.getScriptProperties().getProperty('OCR_KEY'));
}
