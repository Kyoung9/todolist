# Modern Todo Dashboard (Vanilla JS)

모던한 감성의 투두 대시보드 프로젝트.
`HTML + CSS + JavaScript`만 사용하며, 아래 기능을 포함합니다.

## 목표 기능
- 실시간 시계
- 로컬 스토리지를 사용한 로그인(이름 기반)
- 로컬 스토리지를 사용한 투두리스트(추가/삭제/완료)
- 랜덤 배경 이미지
- 위치 정보(Geolocation) + 날씨 표시

## 디자인 방향
- 배경: Figma Textures Kit 기반 무채색 텍스처 이미지 사용
  - 참고: https://www.figma.com/community/file/1051984823754653573/textures-kit
- 전체 톤: 모노톤 + 고대비 타이포 + 최소한의 UI
- 레이아웃: Momentum 스타일(상단 날씨, 중앙 대형 시계/인사, 하단 todo dock)

## 기술 스택
- HTML5 (시맨틱 마크업)
- CSS3 (커스텀 프로퍼티, 반응형 레이아웃, 애니메이션)
- Vanilla JavaScript (ES Modules)
- Browser APIs
  - `localStorage`
  - `navigator.geolocation`
  - Weather API (예: OpenWeatherMap)

## 제안 파일 구조
시니어 엔지니어 관점으로 기능 단위 분리:

```text
todolist/
  index.html
  README.md
  assets/
    bg/
      texture-01.jpg
      texture-02.jpg
      ...
    icons/
      weather/
  css/
    reset.css
    variables.css
    base.css
    layout.css
    components.css
    utilities.css
  js/
    app.js
    constants/
      storageKeys.js
      config.js
    utils/
      storage.js
      date.js
      dom.js
      random.js
    services/
      weatherService.js
      locationService.js
    features/
      clock/
        clock.js
      auth/
        auth.js
      todo/
        todo.js
      background/
        background.js
      weather/
        weather.js
```

## localStorage 설계
- `todo.username`: 로그인 사용자 이름
- `todo.items:<normalized_username>`: 사용자별 투두 배열(JSON)
- `todo.lastBg`: 마지막 배경 이미지 경로
- 레거시 키 `todo.items`가 있으면 첫 로그인 사용자 키로 1회 마이그레이션

키 정규화 규칙:
- trim 후 연속 공백을 1칸으로 축약
- 소문자 변환
- 예: `Young Pin` -> `todo.items:young pin`

`todo.items:young pin` 예시:

```json
[
  { "id": 1739038800000, "text": "운동하기", "done": false, "createdAt": "2026-02-08T10:00:00.000Z" },
  { "id": 1739039800000, "text": "프로젝트 정리", "done": true, "createdAt": "2026-02-08T10:16:40.000Z" }
]
```

## 화면 구성 (MVP)
- 상단: 위치/날씨
- 중앙: 날짜 + 대형 실시간 시계 + 인사/로그인
- 하단: 투두 입력 + 리스트 + 필터 + 완료 일괄 삭제
- 배경: 앱 로드 시 랜덤 텍스처 1장 선택(직전 배경은 가능하면 회피)

## 현재 동작 규칙
- 로그인 전에는 투두 입력/필터/완료삭제/리스트 액션이 잠금 상태
- 로그인 후에만 투두 기능 활성화
- 사용자별로 독립된 투두 데이터 로드/저장
- 투두 수정은 인라인 편집으로 동작하며 `Enter` 저장, `Escape` 취소
- `active` 상태 태스크는 드래그앤드롭으로 순서 변경 가능
- 배경 이미지는 앱 로드 시 랜덤 적용 + 일정 주기로 자동 회전
- 로그인 후 상단 `Shuffle background` 버튼으로 즉시 랜덤 변경 가능
- 배경 변경 시 2개 레이어를 사용해 부드러운 크로스페이드 전환
- 로그인 후 시계 위에 시간대 기반 인사 문구를 표시 (`Good evening, {username}`)

## 기능별 구현 가이드
1. `clock`
   - `setInterval`로 1초마다 시계 갱신
2. `auth`
   - 이름 입력 후 저장
   - 재방문 시 자동 로그인 상태 복원
   - 로그인 상태 변경 시 todo 접근 권한 동기화
3. `todo`
   - 로그인 사용자 기준으로 저장 키 분리
   - CRUD 중 MVP는 생성/수정/완료토글/삭제
   - 변경 시 즉시 사용자별 `localStorage` 동기화
4. `background`
   - `assets/bg` 목록에서 랜덤 선택 후 `body` 배경 적용
   - 새로고침 시에도 랜덤 회전
5. `weather`
   - Geolocation 성공 시 위/경도 기반 날씨 API 호출
   - 실패 시 graceful fallback 메시지 표시
   - API 키는 코드에 공개된 고정값을 사용
     - `js/constants/config.js`
     - `index.html` (`window.__WEATHER_API_KEY__`)

## 실행 방법
정적 파일 프로젝트이므로 간단히 실행할 수 있습니다.

1. `index.html`을 브라우저에서 열기
2. 또는 로컬 서버 사용 (예: VSCode Live Server)

참고:
- API 키는 공개 상태입니다.
- 키를 숨기려면 서버 프록시(백엔드)로 이전해야 합니다.

## 개발 체크리스트
- [x] 기본 HTML 레이아웃 작성
- [x] CSS 토큰/레이아웃/컴포넌트 분리
- [x] 시계 모듈 구현
- [x] 로그인 모듈 구현(localStorage)
- [x] 투두 모듈 구현(localStorage)
- [x] 랜덤 배경 적용
- [x] 위치/날씨 API 연동
- [x] 모바일 반응형/접근성 점검

## 참고 사항
- 프론트엔드에 포함된 API 키는 사용자에게 노출됩니다.
- 키를 완전히 숨기려면 서버 프록시(백엔드)에서 날씨 API를 호출해야 합니다.
