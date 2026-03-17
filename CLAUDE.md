# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

감정 기반 맛집 큐레이션 SPA. 사용자의 텍스트를 Gemini API로 감정 분류하고 네이버 맛집 검색 결과를 보여주는 내부 공유용 캐주얼 프로젝트.

## 명령어

```bash
npm run dev      # Vite 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run lint     # ESLint
npm run preview  # 빌드 결과 미리보기
```

## 기술 스택

Vite + React 19 + Tailwind CSS v4 (`@theme` directive in `index.css`, no tailwind.config.js)

## 아키텍처

2단계 SPA 플로우: `input` → `loading` → `result` (App.jsx의 step 상태로 제어)

### 데이터 흐름

1. 사용자 텍스트 입력 (InputScreen)
2. Gemini API로 감정 분류 → 5가지 중 하나: `anger`, `depression`, `burnout`, `joy`, `anxiety`
3. 감정에 매칭된 멘트 랜덤 선택 (data/ments.json)
4. 감정별 메뉴 키워드로 네이버 맛집 검색 (data/keywords.js → services/naver.js)
5. 결과 표시: 감정 이미지 + 타이핑 멘트 + 맛집 카드 5개 (ResultScreen)

### 외부 API 연동

- **Gemini API**: `services/gemini.js` — `@google/generative-ai` SDK, 클라이언트에서 직접 호출. 환경변수 `VITE_GEMINI_API_KEY`.
- **네이버 지역 검색**: `services/naver.js` → `proxy/worker.js` (Cloudflare Workers) 경유. 네이버 API 키는 Worker 환경변수에서 관리. 클라이언트 환경변수 `VITE_NAVER_PROXY_URL`.

### 디자인 시스템 (src/index.css)

색상/폰트는 Tailwind `@theme`에서 CSS 변수로 관리. 미니멀 흑백 톤 기반.
- 폰트: Noto Serif KR (제목, serif) + Pretendard (본문, sans)
- 커스텀 CSS: `fade-enter-active` (화면 전환), `typing-cursor` (타이핑 효과)

### 멘트 데이터

`src/data/ments.json`에 JSON으로 관리 (감정 6종 × 20개 = 120개). `ments.js`에서 import하여 사용. 멘트 추가/수정 시 JSON 파일만 편집.

### 감정 분류 fallback

Gemini 응답이 유효한 키워드가 아닐 경우 → 부분 매칭 시도 → 최종 fallback `anxiety`.

## 스펙 문서

`docs/superpowers/specs/2026-03-12-bingssyang-design.md` — 전체 설계 문서 (플로우, UI/UX 가이드, 데이터 구조, 에러 처리 정책)
