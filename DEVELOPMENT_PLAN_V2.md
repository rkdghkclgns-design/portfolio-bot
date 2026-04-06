# Portpolio_BOT 개발 계획서 V2

> **작성일**: 2026-03-09
> **작성**: 까망이 🐱
> **대상 프로젝트**: Portpolio_BOT (Game Career Assistant)
> **전제**: Phase 1~3 구현 완료 (모델 레지스트리, 프롬프트 외부화, RAG 데이터 구조)

---

## 전체 로드맵

| 단계 | 작업 | 우선순위 | 상태 |
|------|------|----------|------|
| Phase A | 프롬프트 고도화 | 🔴 즉시 | ✅ 뼈대 완료 |
| Phase B | 게임잡 크롤링 봇 내장 | 🟡 다음 | ✅ 병합 완료 |
| Phase B-ext | 크롤링 태그 선택 UI 확장 | 🟡 다음 | 대기 |
| Phase C | 적성검사 / 과제 모의시험 봇 | 🟢 보류 | 코드 제공 대기 |

---

## Phase A: 프롬프트 고도화

### A-1. 현황 진단

| 항목 | 현재 상태 | 문제점 |
|------|-----------|--------|
| system-prompt.md | 4줄 역할 정의 | 너무 추상적, 게임 업계 맥락 부족 |
| userPrompt | App.jsx 내 템플릿 문자열 | 외부화 안됨, JD 정보 전달이 단순 나열 |
| 응답 스키마 | 4개 필드 (이력서/자소서/포폴/면접) | 프로필 강약점 분석 없음, 질문이 2개 고정 |
| 포트폴리오 피드백 | 파일 첨부 시 AI가 직접 분석 | 첨부 없을 때 fallback이 1개짜리 템플릿 |
| 면접 준비 | 직무별 질문 2개 고정 | 유형 다양성 없음, 인성/직무/산업 구분 없음 |

### A-2. 개선 방향

#### A-2-1. 시스템 프롬프트 고도화 (`prompts/system-prompt.md`)

현재 단순 역할 정의 → 아래 항목을 구조화하여 확장:

- **AI 역할 명확화**: "탑티어 게임사 채용 담당자 + 커리어 코치" 이중 역할
- **게임 업계 컨텍스트 주입**: 직군별 평가 기준 (클라이언트/서버/기획/QA/아트 등)
- **출력 품질 기준**: BLUF 원칙, 수치 근거 우선, 추상적 조언 금지 지침
- **지원자 유형별 가이드라인**: 신입(포폴 중심) / 경력(성과 수치 중심) 분기 처리

#### A-2-2. userPrompt 외부화 (`prompts/user-prompt-template.md`)

현재 App.jsx 내부 템플릿 → 외부 MD 파일로 분리:

- 지원자 프로필 섹션 구조화 (강점·약점·경력 갭 명시 요청)
- JD 매칭 분석 지시 추가 (공고 요구 스킬 vs 보유 스킬 갭 분석)
- 파일 첨부 여부에 따른 분기 지시문 포함

#### A-2-3. 응답 스키마 확장 (`prompts/analysis-schema.json`)

현재 4개 필드 → 아래 항목 추가:

```json
{
  "profileAnalysis": {
    "strengths": ["강점 항목"],
    "weaknesses": ["약점 / 보완 필요 항목"],
    "fitScore": "JD 매칭 총평 (한 줄)"
  },
  "resumeImprovements": ["(기존 유지, 항목 수 3~5개로 확대)"],
  "coverLetterImprovements": ["(기존 유지)"],
  "portfolioImprovements": ["(기존 유지, 파일 없을 시 구조 가이드 제공)"],
  "interviewPreps": [
    {
      "rank": 1,
      "company": "회사명",
      "idealCandidateReflected": "인재상 어필 전략",
      "assignmentGuide": "과제 대비 팁",
      "questions": [
        {
          "type": "직무역량 | 인성 | 산업이해 | 문제해결",
          "question": "질문 내용",
          "avoid": "피해야 할 답변",
          "recommend": "권장 답변 방향"
        }
      ]
    }
  ]
}
```

> **면접 질문**: 회사당 2개 고정 → **3~4개, 유형(type) 태그 추가**

#### A-2-4. 직군별 프롬프트 분기

현재 단일 프롬프트 → 직군별 평가 포인트 주입:

| 직군 | 강조 평가 포인트 |
|------|-----------------|
| 클라이언트 | 렌더링 파이프라인 이해, 최적화 경험, Unreal/Unity 숙련도 |
| 서버 | 대규모 트래픽 처리, DB 설계, 분산 시스템 경험 |
| 기획 | 지표 기반 의사결정, BM 설계, 유저 데이터 분석 경험 |
| QA | 자동화 테스트 구축, 버그 재현율, 회귀 테스트 전략 |
| 아트 | 포폴 퀄리티, 엔진 내 작업 경험, 스타일 적응력 |

### A-3. 작업 파일 목록

| 파일 | 작업 내용 |
|------|-----------|
| `prompts/system-prompt.md` | 전면 재작성 |
| `prompts/user-prompt-template.md` | 신규 생성 (App.jsx에서 분리) |
| `prompts/analysis-schema.json` | profileAnalysis, question.type 필드 추가 |
| `prompts/analysis-schema.md` | 스키마 설명 문서 업데이트 |
| `server.js` | userPrompt 파일 로드 로직 추가 |
| `src/App.jsx` | userPrompt 조립 로직 → 서버로 이전 |

### A-4. 예상 공수

약 **2~3시간** (프롬프트 설계 + 스키마 수정 + 서버/클라이언트 연동)

---

## Phase B: 게임잡 크롤링 봇

### B-1. 목표

[게임잡(gamejob.co.kr)](https://www.gamejob.co.kr) 공고를 자동 수집하여 `data/jobs/`, `data/companies/`에 적재. Portpolio_BOT이 항상 최신 공고를 사용.

### B-2. 아키텍처 설계

```
crawler/                        ← 별도 독립 서비스
├── index.js                    ← 진입점 (CLI + 스케줄러)
├── config.json                 ← 크롤링 대상 URL, 주기, 필터 설정
├── scrapers/
│   ├── gamejob.js              ← 게임잡 크롤러 (Playwright 또는 Cheerio)
│   └── parser.js               ← 공고 HTML → 구조화 JSON 파싱
├── normalizer.js               ← 파싱 결과 → data/jobs/ 스키마 정규화
├── writer.js                   ← JSON 파일 저장 + _index.json 갱신
└── scheduler.js                ← cron 기반 주기 실행 (기본 1회/일)
```

### B-3. 크롤링 대상 및 수집 필드

**대상**: `https://www.gamejob.co.kr/Recruit/Job/List` (필터: 게임개발직)

**수집 필드**:

| 필드 | 설명 |
|------|------|
| `id` | 공고 고유 번호 (GI_No) |
| `company` | 회사명 |
| `title` | 공고 제목 |
| `role` | 직군 (클라이언트/서버/기획/QA/아트 등) |
| `reqSkills` | 요구 기술스택 |
| `reqExp` | 최소 경력 (년) |
| `url` | 원본 공고 URL |
| `hasAssignment` | 코딩테스트/과제 여부 |
| `assignmentType` | 과제 유형 |
| `deadline` | 마감일 |
| `updatedAt` | 수집 일시 |
| `source` | `"gamejob-crawler"` |

### B-4. 기술 스택 선택

| 옵션 | 장점 | 단점 | 선택 |
|------|------|------|------|
| Playwright | JS 렌더링 지원, 안정적 | 무겁고 설치 필요 | ✅ 1순위 |
| Cheerio + Axios | 가볍고 빠름 | SPA 미지원 | 🔸 SSR 페이지에만 |
| Puppeteer | Playwright 유사 | Playwright 대비 생태계 작음 | ❌ |

> 게임잡이 SSR 기반이므로 **Cheerio + Axios로 우선 시도**, 실패 시 Playwright 전환

### B-5. 연동 방식

```
crawler 실행
    └→ data/jobs/job-{id}.json 갱신
    └→ data/jobs/_index.json 갱신
    └→ Portpolio_BOT server.js의 DataLoader가 TTL 만료 시 자동 반영
```

- 크롤러와 메인 봇은 **파일시스템 공유**로 연동 (별도 API 불필요)
- 크롤러 실행 후 `/api/data/refresh` 호출하면 즉시 반영 가능

### B-6. 스케줄링

```json
// crawler/config.json
{
  "schedule": "0 9 * * *",      // 매일 오전 9시
  "targets": ["gamejob"],
  "filters": {
    "roles": ["클라이언트", "서버", "기획", "QA", "아트", "TA"],
    "companies": []              // 비어있으면 전체 수집
  },
  "outputPath": "../data"
}
```

### B-7. 예상 공수

약 **1~2일** (크롤러 구조 + 파싱 + 정규화 + 연동 테스트)

---

## Phase B-ext: 크롤링 태그 선택 UI 확장 (계획)

> **상태**: 병합 완료, 확장 대기. 현재 하드코딩 `['게임기획', '신입']` → UI 체크박스로 전환.

### 확장 구조

#### 1. GameJob 태그 분류 체계

```
직군 태그 (복수 선택)
├── 게임기획
├── 게임개발(클라이언트)
├── 서버
├── 원화 / 모델링 / 애니메이션
├── QA·테스터
├── 게임운영
└── 사업기획(국내/해외)

경력 태그 (단일 선택)
├── 신입
├── 1~3년차
├── 3~5년차
├── 경력무관
└── 경력자
```

#### 2. UI 설계 방향

설정 모달 내 크롤링 섹션에 2단 체크박스 그리드 추가:
- **직군**: 복수 선택 가능 (체크박스)
- **경력**: 단일 선택 (라디오 버튼)
- 선택 결과 → `targets[]` 배열로 `/api/crawl/start`에 전달

#### 3. 데이터 흐름

```
사용자 태그 선택
  → POST /api/crawl/start { targets: ['게임기획', '서버', '신입'] }
  → crawler.js: labels 매칭 & 클릭
  → data/refined/*.json 저장
  → job-normalizer: refined → data/jobs/ 정규화
  → DataLoader 캐시 리프레시
  → 프론트엔드 공고 목록 갱신
```

#### 4. 예상 공수
약 **2~3시간** (UI 컴포넌트 + API 파라미터 확장 + 테스트)

---

## Phase C: 적성검사 / 과제 모의시험 봇 (보류)

### C-1. 개요

기업별 코딩테스트 / 인적성 / 실기과제를 모의 시험 환경에서 연습하는 별도 서비스.

### C-2. 설계 방향 (선행 검토)

| 항목 | 방향 |
|------|------|
| 인적성 모듈 | 기업별 문제 유형 DB + AI 채점 |
| 코딩테스트 모듈 | 문제 제공 + 코드 실행 환경 (Judge0 or 자체) |
| 실기과제 모듈 | 제공 코드/리소스 기반 과제 + AI 피드백 |
| 연동 | 메인 Portpolio_BOT의 기업 데이터 공유 |

> **현재 상태**: 코드 제공 대기 중. 제공 후 아키텍처 설계 및 구현 착수.

---

## 작업 순서 요약

```
Phase A (프롬프트 고도화)
  ├── A1. system-prompt.md 재작성
  ├── A2. user-prompt-template.md 신규 생성 + 서버 로드 로직
  ├── A3. analysis-schema 확장 (profileAnalysis, question.type)
  └── A4. 직군별 프롬프트 분기 로직

Phase B (크롤링 봇 내장) — ✅ 완료
  ├── B1. crawler.js → lib/crawler.js ESM 변환 ✅
  ├── B2. server.js SSE 엔드포인트 + 정규화 자동 연계 ✅
  ├── B3. App.jsx 설정 모달 + 크롤링 UI ✅
  └── B4. playwright 의존성 추가 ✅

Phase B-ext (태그 선택 UI) — 다음
  ├── B-ext1. GameJob 태그 분류 체계 정의
  ├── B-ext2. 설정 모달 체크박스 그리드 UI
  └── B-ext3. targets 파라미터 연동 테스트

Phase C (모의시험 봇) — 코드 제공 후 착수
```

---

*Portpolio_BOT DEVELOPMENT_PLAN_V2.md — 2026-03-12 (v2.1: Phase B 병합 완료)*
