# 192.168.0.9를 Vercel처럼 쓰기 — 전체 구성

Vercel이 지금 자동으로 해주는 4가지를 각각 무엇으로 대체하는지 정리했습니다.

| Vercel 기능 | 로컬(192.168.0.9) 대체 |
|---|---|
| 정적 파일 서빙 + 3개 앱 라우팅(/, /portal, /separator) | nginx (`nginx.conf`, 이 폴더) |
| main에 push하면 자동 재배포 | GitHub Actions self-hosted runner (`.github/workflows/deploy-local-server.yml`) |
| 자동 HTTPS + 외부 접속(포트포워딩 불필요) | Cloudflare Tunnel |
| 상시 가동 | 위 세 가지를 전부 Windows 서비스로 등록 |

아래 순서대로 하시면 됩니다. (192.168.0.9 PC에서, Claude Code 켠 상태로 진행하시면 각 단계를 직접 시켜도 됩니다.)

## 1. nginx 설치 + 정적 서빙

1. https://nginx.org/en/download.html 에서 Windows용 다운로드, 압축 해제 (예: `C:\nginx`)
2. `deploy/local-server/nginx.conf`를 `C:\nginx\conf\ohsung-system.conf`로 복사
3. 파일 안의 `root C:/ohsung-system/dist;` 경로를 실제 클론 위치로 수정
4. `C:\nginx\conf\nginx.conf`의 `http { ... }` 블록 안에 `include ohsung-system.conf;` 한 줄 추가
5. `cd C:\nginx && nginx.exe -t` 로 문법 확인 후 `nginx.exe` 로 실행 (또는 NSSM으로 Windows 서비스 등록해서 상시 가동)
6. `http://localhost:8080` 접속해서 화면 뜨는지 확인

## 2. GitHub Actions self-hosted runner (자동 배포)

1. GitHub 저장소(`kaibayosung/ohsung-system`) > Settings > Actions > Runners > "New self-hosted runner" > Windows 선택
2. 화면에 나오는 안내를 192.168.0.9의 PowerShell에서 그대로 실행 (config.cmd에서 라벨 물어볼 때 `ohsung-local` 입력)
3. `.\run.cmd`로 실행 확인 후, 상시 가동하려면 `.\svc.cmd install` 로 서비스 등록
4. 이후 `main`에 push할 때마다 이 PC가 자동으로 `git pull` → `npm ci` → `npm run build`를 실행해서 nginx가 서빙하는 `dist/`가 최신으로 갱신됩니다.

## 3. Cloudflare Tunnel (외부 접속 + 자동 HTTPS)

사용 도메인: **osungsteel.co.kr** (닷네임코리아 등록, 만료 2028-09-03) — 서브도메인 **smart.osungsteel.co.kr**로 서비스를 노출하는 걸 추천드립니다(루트 도메인은 나중에 회사 홈페이지 등 다른 용도로 남겨둘 수 있게).

### 3-1. 도메인을 Cloudflare로 연결 (최초 1회, 닷네임코리아 쪽 작업)

⚠️ 먼저 닷네임코리아 관리자 페이지의 **DNS 레코드 설정** 메뉴에 들어가서 지금 등록된 레코드(특히 회사 이메일을 쓰고 계시면 MX 레코드)를 캡처해두세요. Cloudflare가 대부분 자동으로 스캔해서 가져오지만, 스캔 후에도 꼭 대조 확인이 필요합니다 — 여기서 놓치면 이메일이 갑자기 안 들어올 수 있습니다.

1. https://dash.cloudflare.com 가입(무료) → "Add a site" → `osungsteel.co.kr` 입력
2. Cloudflare가 기존 DNS 레코드를 자동 스캔 → 위에서 캡처해둔 레코드와 대조해서 빠진 게 없는지 확인
3. Cloudflare가 네임서버 2개를 알려줍니다 (예: `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`)
4. 닷네임코리아 관리자 페이지 왼쪽 메뉴의 **"네임서버 변경"**(스크린샷에 보이는 그 메뉴)에 들어가서 기존 네임서버를 Cloudflare가 알려준 2개로 교체
5. 보통 몇 시간~1일 내 전파되고, Cloudflare가 활성화되면 이메일로 알려줍니다

### 3-2. Tunnel 생성 (192.168.0.9에서, Claude Code로 진행 가능)

1. `winget install --id Cloudflare.cloudflared`
2. `cloudflared tunnel login` (브라우저 열려서 Cloudflare 계정으로 로그인 + osungsteel.co.kr 권한 부여)
3. `cloudflared tunnel create ohsung-system`
4. `cloudflared tunnel route dns ohsung-system smart.osungsteel.co.kr`
5. 설정파일(`config.yml`)에 `service: http://localhost:8080` 지정 (아래 예시 참고)
6. `cloudflared service install` 로 Windows 서비스 등록 → 상시 가동

이 단계까지 마치면 `smart.osungsteel.co.kr` 접속 시 자동으로 Cloudflare가 발급한 인증서로 HTTPS 처리되고, 실제 트래픽은 터널을 통해 192.168.0.9로만 전달됩니다 — 공유기에서 포트를 열 필요가 없습니다.

`config.yml` 예시 (보통 `C:\Users\<사용자>\.cloudflared\config.yml`):

```yaml
tunnel: ohsung-system
credentials-file: C:\Users\<사용자>\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: smart.osungsteel.co.kr
    service: http://localhost:8080
  - service: http_status:404
```

메인 앱(`/`), 고객사 포탈(`/portal`), 세퍼레이터(`/separator`)가 전부 nginx 하나(8080 포트) 뒤에 있으므로, 이 설정 하나로 세 화면 다 `smart.osungsteel.co.kr` 아래에서 외부 접속이 됩니다. 지금 Vercel에서 쓰시던 `ohsung-system.vercel.app` 대신 새 도메인으로 바뀌는 셈이라, 거래처에 전달한 포탈 링크가 있다면 갱신이 필요합니다.

## 고객사 포탈처럼 외부 사용자가 접속할 경우 추가로 고려할 점

내부 직원만 쓰는 화면과 달리 거래처가 접속하는 서비스라서 신뢰성·보안 기준이 한 단계 올라갑니다.

- **가동 안정성**: PC 재부팅, 정전, 공유기 재시작, 인터넷 회선 장애 중 하나만 발생해도 거래처가 포탈에 못 들어갑니다. UPS는 필수에 가깝고, PC 자동 재부팅 시 nginx·cloudflared가 자동으로 다시 뜨도록 반드시 Windows 서비스로 등록해두어야 합니다(수동 실행 금지).
- **Cloudflare가 앞단 방어막 역할**: 터널을 쓰면 Cloudflare의 기본 DDoS 방어가 자동 적용되고, 필요시 무료 WAF 규칙도 추가할 수 있습니다 — 포트를 직접 여는 것보다 안전합니다.
- **RLS는 이미 되어 있음**: `customer_users`/`is_my_company()` 기반 행 단위 접근 제어는 Supabase 쪽에 이미 구현되어 있어서, 호스팅 위치가 바뀌어도(Vercel→로컬) 데이터 접근 권한 자체는 그대로 안전합니다.
- **도메인**: 거래처에 신뢰감을 주려면 `*.trycloudflare.com` 같은 임시 주소보다는 정식 도메인(회사 도메인의 서브도메인)을 쓰는 걸 권해드립니다.

## 참고 — Vercel과 완전히 같지는 않은 부분

- **글로벌 CDN**: Vercel은 전 세계 엣지에서 서빙하지만, 여기는 물리적으로 한 대의 PC입니다. 사내/국내 사용자 위주라면 체감 차이는 거의 없습니다.
- **무중단 배포**: 위 워크플로우는 빌드가 끝나는 즉시 반영이라 아주 짧은 순간(빌드 중) 일부 파일이 갱신되는 도중일 수 있습니다. 트래픽이 많지 않은 사내 도구라 실질적 문제는 없지만, 완전히 없애려면 `dist_new`에 빌드 후 폴더를 원자적으로 교체하는 스크립트를 추가하면 됩니다.
- **가동 시간**: PC가 꺼지거나 인터넷이 끊기면 서비스도 같이 끊깁니다. UPS(무정전전원장치) 연결을 권장합니다.
