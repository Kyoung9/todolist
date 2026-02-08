# Modern Todo Dashboard (Vanilla JS)

[한국어](README.md) | [English](README.en.md) | [日本語](README.ja.md)

`HTML + CSS + Vanilla JavaScript`로 만든 투두 대시보드입니다.  
핵심은 사용자별 Todo 저장, 실시간 시계, 배경 로테이션, 위치 기반 날씨를 한 화면에서 제공하는 것입니다.

## 핵심 기능

### 1) 사용자 로그인 & 접근 제어
- 이름(2~20자)으로 로그인하고 `localStorage`에 저장
- 재방문 시 로그인 상태 자동 복원
- 로그인 전에는 Todo 입력/필터/액션 잠금
- `Change user` 버튼으로 로그아웃 후 사용자 전환
- 로그인 상태에 따라 인사 문구/배경 셔플 버튼 표시 제어

### 2) Todo 관리
- 할 일 추가, 완료/미완료 토글, 삭제
- 인라인 수정 지원 (`Enter` 저장, `Escape` 취소)
- 중복 항목 방지(대소문자 무시), 공백 정규화
- 입력 길이 제한(최대 80자)
- 필터: `All` / `Active` / `Done`
- `Clear completed`로 완료 항목 일괄 삭제
- 드래그 앤 드롭으로 `Active` Todo 리스트 순서 변경
- 요약 카운트 표시: `active · done · total`

### 3) 사용자별 데이터 저장
- 사용자명 기준으로 Todo 저장 키 분리
- 저장 키: `todo.items:<normalized_username>`
- 레거시 키 `todo.items`가 있으면 첫 로그인 시 1회 마이그레이션
- 주요 `localStorage` 키
  - `todo.username`
  - `todo.items:<username>`
  - `todo.lastBg`

### 4) 배경 시스템
- 다크/라이트 텍스처 이미지 풀에서 랜덤 선택
- 앱 시작 시 랜덤 배경 적용
- 2분 간격 자동 회전
- `Shuffle background` 버튼으로 즉시 변경
- 2개 레이어 크로스페이드 전환
- 배경 톤(light/dark)에 맞춰 UI 클래스 자동 전환

### 5) 시계 & 날짜 & 인사
- 실시간 시계(1초 주기 갱신)
- 날짜(ko-KR 포맷) 표시
- 시간대 기반 인사 문구 출력
  - morning / afternoon / evening / night

### 6) 위치 기반 날씨
- Geolocation으로 현재 위치 조회
- OpenWeather API 호출(섭씨, 한국어 설명)
- 10분 간격 자동 갱신
- 위치 권한 거부/네트워크/API 실패 시 안내 메시지 표시

### 7) 모듈 로드 실패 대비(Fallback)
- 모듈 스크립트가 실패해도 로그인 폼 기본 동작 유지
- 최소한 사용자명 저장 후 재로드 가능

## 실행 방법

1. `index.html` 파일을 브라우저에서 직접 열기
2. 위치 권한 요청이 뜨면 허용(날씨 기능 사용 시)
