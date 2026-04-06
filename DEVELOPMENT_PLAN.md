# Portpolio_BOT 개선 개발 계획서

> **작성일**: 2026-03-06
> **작성**: 까망이 🐱
> **대상 프로젝트**: Portpolio_BOT (Game Career Assistant)

---

## 0. 현재 프로젝트 구조 요약

```
Portpolio_BOT/
├── server.js              ← Express 백엔드 (AI API 프록시, 분석 엔드포인트)
├── src/
│   ├── App.jsx            ← 단일 컴포넌트 (≈800줄, 모든 UI/로직 집중)
│   ├── main.jsx           ← React 진입점
│   ├── index.css           ← Tailwind CSS
│   └── data/
│       ├── companies.js   ← 6개 게임사 하드코딩 데이터
│       ├── jobs.js        ← 15개 채용공고 하드코딩 데이터
│       └── skills.js      ← 스킬 카테고리/직군 정의
├── vite.config.js
├── package.json
└── tailwind.config.js
```

**현재 문제점**:
- AI 모델이 `gemini-2.0-flash` (2026.06 퇴역 예정), `claude-3-5-sonnet`, `gpt-4o-mini`로 고정
- 시스템 프롬프트 & JSON 스키마가 `server.js`에 하드코딩
- 기업/공고 데이터가 `src/data/`에 JS 파일로 하드코딩 (확장 불가)
- `App.jsx`가 ≈800줄 단일 파일 (유지보수 어려움)

---

## Phase 1: AI 모델 개편 — Gemini 3.1 Pro / Flash 대응

### 1-1. 배경: 현재 Gemini 모델 상황 (2026.03 기준)

| 구분 | 모델명 | 상태 |
|------|--------|------|
| ❌ 현재 사용 중 | `gemini-2.0-flash` | **2026.06.01 퇴역 예정** |
| ✅ 안정 버전 (권장) | `gemini-2.5-pro`, `gemini-2.5-flash` | GA (안정) |
| 🆕 최신 프리뷰 | `gemini-3.1-pro-preview`, `gemini-3-flash-preview` | Preview (불안정) |

> **참고**: `gemini-3.0-pro-preview`는 **2026.03.09 셧다운 예정**이므로 사용 불가.

### 1-2. 설계 방향

사용자 요청에 따라 **Gemini만 우선 대응**하되, 추후 Claude/GPT 재추가를 고려한 구조로 설계.

### 1-3. 변경 사항

#### `server.js` — 모델 설정 리팩토링

```js
// 기존: 단일 모델 하드코딩
const MODELS = {
  gemini: 'gemini-2.0-flash',
  claude: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o-mini',
};

// 변경: 모델 레지스트리 구조
const MODEL_REGISTRY = {
  gemini: {
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (안정·빠름)', default: true },
      { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro (안정·고성능)' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (프리뷰·최신)' },
    ],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    buildUrl: (modelId, apiKey) =>
      `${MODEL_REGISTRY.gemini.baseUrl}/${modelId}:generateContent?key=${apiKey}`,
  },
  // 추후 claude, openai 확장 가능
};
```

#### `src/App.jsx` — 프론트엔드 모델 선택 UI

- 기존 3-provider 토글 → **Gemini 전용** 모델 드롭다운으로 변경
- Claude/OpenAI 선택 영역은 `disabled` 상태로 "준비 중" 표시
- 모델별 특성(속도/품질) 안내 툴팁 추가

#### 새 API 엔드포인트: `GET /api/models`

- 서버에서 사용 가능한 모델 목록을 동적으로 반환
- 프론트엔드가 이 목록을 받아 UI 렌더링 → 서버 설정만 바꾸면 모델 추가/제거 가능

### 1-4. 작업 목록

| # | 작업 | 파일 |
|---|------|------|
| 1 | `MODEL_REGISTRY` 구조 정의 및 모델 목록 관리 | `server.js` |
| 2 | `GET /api/models` 엔드포인트 추가 | `server.js` |
| 3 | `POST /api/validate-key` Gemini 전용으로 리팩토링 | `server.js` |
| 4 | `POST /api/analyze` 동적 모델 선택 지원 | `server.js` |
| 5 | 프론트엔드 모델 선택 UI 변경 (드롭다운) | `src/App.jsx` |
| 6 | Claude/OpenAI 관련 코드 비활성화 (삭제X, 주석처리) | `server.js`, `src/App.jsx` |

---

## Phase 2: AI 프롬프트 외부 파일 분리

### 2-1. 설계 방향

현재 `server.js`에 하드코딩된 `SYSTEM_PROMPT`, `JSON_SCHEMA_PROMPT`, `GEMINI_RESPONSE_SCHEMA`를
별도 `.md` 파일로 분리하여 **코드 수정 없이 프롬프트를 수정·확인**할 수 있도록 함.

### 2-2. 디렉토리 구조

```
Portpolio_BOT/
├── prompts/                          ← 🆕 프롬프트 디렉토리
│   ├── system-prompt.md              ← 시스템 프롬프트 (역할 정의)
│   ├── analysis-schema.md            ← JSON 스키마 설명 (Claude/GPT용)
│   ├── analysis-schema.json          ← Gemini 구조화 응답 스키마
│   └── README.md                     ← 프롬프트 수정 가이드
├── server.js                         ← fs.readFileSync로 프롬프트 로드
└── ...
```

### 2-3. 동작 방식

```js
// server.js — 서버 시작 시 프롬프트 파일 로드
import { readFileSync } from 'fs';

function loadPrompts() {
  return {
    systemPrompt: readFileSync('./prompts/system-prompt.md', 'utf-8'),
    jsonSchemaPrompt: readFileSync('./prompts/analysis-schema.md', 'utf-8'),
    geminiResponseSchema: JSON.parse(readFileSync('./prompts/analysis-schema.json', 'utf-8')),
  };
}

// 개발 모드에서는 요청마다 리로드 (hot-reload)
// 프로덕션에서는 시작 시 1회 로드 후 캐싱
```

### 2-4. 프롬프트 파일 내용 (초안)

**`prompts/system-prompt.md`**:
```markdown
당신은 탑티어 게임 회사의 시니어 채용 담당자입니다.
모든 답변은 결론을 먼저 말하는 두괄식(BLUF)과 개조식(- 항목) 포맷을 엄격히 지켜서 작성하세요.
구구절절한 서술형은 금지입니다.
게임 업계 특성을 반드시 반영하여 실질적이고 구체적인 피드백을 제공하세요.
```

### 2-5. 작업 목록

| # | 작업 | 파일 |
|---|------|------|
| 1 | `prompts/` 디렉토리 생성 | - |
| 2 | 기존 프롬프트를 `.md` / `.json` 파일로 추출 | `prompts/*` |
| 3 | `server.js`에 프롬프트 로더 함수 구현 | `server.js` |
| 4 | 개발 모드 핫 리로드 / 프로덕션 캐싱 분기 | `server.js` |
| 5 | `prompts/README.md` 작성 (수정 가이드) | `prompts/README.md` |

---

## Phase 3: 외부 데이터 RAG 구조 설계

### 3-1. 설계 방향

현재 `src/data/companies.js`, `jobs.js`에 하드코딩된 데이터를
**외부 JSON 디렉토리**에서 읽어오는 구조로 전환.
추후 게임잡 크롤링 → NAS 적재 파이프라인과 연결될 수 있도록 설계.

### 3-2. 데이터 디렉토리 구조

```
Portpolio_BOT/
├── data/                              ← 🆕 외부 데이터 디렉토리 (서버 사이드)
│   ├── companies/
│   │   ├── _index.json                ← 기업 목록 인덱스
│   │   ├── nexon.json                 ← 개별 기업 상세 데이터
│   │   ├── ncsoft.json
│   │   ├── krafton.json
│   │   ├── pearl-abyss.json
│   │   ├── smilegate.json
│   │   └── netmarble.json
│   ├── jobs/
│   │   ├── _index.json                ← 공고 목록 인덱스 (메타데이터)
│   │   └── *.json                     ← 개별 공고 상세
│   └── config.json                    ← 데이터 소스 설정 (로컬/NAS 경로 등)
├── server.js
└── src/
    └── data/                          ← 기존 하드코딩 데이터 → 제거 (서버 API로 대체)
```

### 3-3. 데이터 파일 포맷 예시

**`data/companies/nexon.json`**:
```json
{
  "id": "nexon",
  "name": "넥슨 (NEXON)",
  "news": ["..."],
  "focus": "...",
  "idealCandidate": "...",
  "games": "...",
  "employees": "약 7,000명",
  "revenue": "약 3조 9,300억 원",
  "benefits": "...",
  "aiAnalysis": "...",
  "updatedAt": "2026-03-01",
  "source": "manual"
}
```

**`data/config.json`**:
```json
{
  "dataSource": "local",
  "localPath": "./data",
  "nasPath": null,
  "refreshInterval": 3600000,
  "version": "1.0.0"
}
```

### 3-4. 서버 API 설계

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/companies` | GET | 기업 목록 (인덱스) |
| `/api/companies/:id` | GET | 기업 상세 정보 |
| `/api/jobs` | GET | 공고 목록 (필터/검색 지원) |
| `/api/jobs/:id` | GET | 공고 상세 정보 |
| `/api/data/status` | GET | 데이터 소스 상태/버전 확인 |

**검색/필터 파라미터** (`/api/jobs`):
```
GET /api/jobs?role=기획&company=넥슨&minExp=0&maxExp=3&skills=Unity,C#
```

### 3-5. 데이터 로더 아키텍처

```js
// server.js — DataLoader 클래스
class DataLoader {
  constructor(configPath = './data/config.json') {
    this.config = JSON.parse(readFileSync(configPath, 'utf-8'));
    this.cache = { companies: null, jobs: null, loadedAt: null };
  }

  // 로컬 파일 시스템에서 데이터 로드
  loadCompanies() { /* data/companies/*.json 스캔 */ }
  loadJobs()      { /* data/jobs/*.json 스캔 */ }

  // 캐시 + TTL 기반 리프레시
  getCompanies() {
    if (this._isCacheStale()) this.loadCompanies();
    return this.cache.companies;
  }

  // 검색/필터링
  searchJobs(filters) { /* role, company, skills 기반 필터 */ }

  // 추후 NAS 연동 확장 포인트
  async refreshFromNAS() { /* config.nasPath가 설정되면 동작 */ }
}
```

### 3-6. 프론트엔드 변경

- `src/data/companies.js`, `jobs.js`의 하드코딩 import 제거
- `App.jsx` 마운트 시 `/api/companies`, `/api/jobs` 호출로 전환
- `useEffect` + 로딩 상태 관리 추가

### 3-7. NAS 연동 확장 준비 (지금 구현 X, 인터페이스만 정의)

```
[게임잡 크롤러] → [NAS 저장소] → [data/ 디렉토리 동기화] → [DataLoader 리프레시]
```

- `data/config.json`의 `nasPath` 필드가 설정되면 NAS에서 주기적 동기화
- 크롤링 데이터 포맷은 위 JSON 스키마와 동일하게 맞춤
- 크롤링 스크립트는 별도 프로젝트로 분리 (이 프로젝트에 포함하지 않음)

### 3-8. 작업 목록

| # | 작업 | 파일 |
|---|------|------|
| 1 | `data/` 디렉토리 구조 생성 | - |
| 2 | 기존 하드코딩 데이터를 JSON 파일로 마이그레이션 | `data/**/*.json` |
| 3 | `DataLoader` 클래스 구현 (로드, 캐시, 검색) | `server.js` 또는 `lib/data-loader.js` |
| 4 | REST API 엔드포인트 추가 (`/api/companies`, `/api/jobs`) | `server.js` |
| 5 | 프론트엔드에서 API 호출로 전환 | `src/App.jsx` |
| 6 | `src/data/companies.js`, `jobs.js` 제거 | `src/data/*` |
| 7 | NAS 연동 인터페이스 스텁 작성 | `lib/data-loader.js` |

---

## Phase 4 (장기): 확장 고려 설계 — 지금 구현하지 않음

현재 Phase 1~3 작업 시, 아래 장기 확장을 **고려한 설계**를 적용합니다.

### 4-1. 마이크로서비스 분리 구조

```
┌─────────────────────────────────────────────────────┐
│                   메인 페이지 (현재 프로젝트)            │
│   "지원자 서류 + 맞춤형 공고 매칭 허브"                  │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │ 매칭엔진  │  │ RAG 데이터│  │ AI 분석   │         │
│   │ (내장)   │  │ (Phase3) │  │ (Phase1) │         │
│   └──────────┘  └──────────┘  └──────────┘         │
│         │              │             │              │
│   ══════╪══════════════╪═════════════╪══════════    │
│         ▼              ▼             ▼              │
│   ┌─────────────────────────────────────────┐       │
│   │         통합 API Gateway (server.js)     │       │
│   └────────────┬────────────┬───────────────┘       │
│                │            │                       │
└────────────────┼────────────┼───────────────────────┘
                 │            │
    ┌────────────▼──┐   ┌────▼────────────┐
    │ 포트폴리오 봇  │   │ 사전 면접 봇     │
    │ (별도 서비스)  │   │ (별도 서비스)    │
    │ POST /review  │   │ POST /interview │
    └───────────────┘   └─────────────────┘
```

### 4-2. 현재 설계에 반영할 확장 포인트

| 확장 항목 | 현재 설계에 반영하는 방식 |
|-----------|--------------------------|
| 포트폴리오 봇 호출 | `server.js`에 외부 서비스 호출용 유틸 함수 스텁 작성 (`callExternalBot()`) |
| 사전 면접 봇 호출 | 동일한 인터페이스로 면접 봇 서비스 연결 가능하도록 설계 |
| 메인 페이지 역할 전환 | `App.jsx` 컴포넌트 분리 시 탭 기반 라우팅 구조 준비 |
| 공통 데이터 공유 | DataLoader가 외부 서비스에도 데이터 제공 가능하도록 REST API 설계 |

### 4-3. App.jsx 컴포넌트 분리 (Phase 1~3 진행 중 병행)

현재 ≈800줄 단일 파일을 아래와 같이 분리:

```
src/
├── App.jsx                ← 메인 레이아웃 + 라우팅
├── components/
│   ├── ModelSelector.jsx  ← AI 모델 선택 UI
│   ├── ProfileForm.jsx    ← 사용자 프로필 입력
│   ├── FileUpload.jsx     ← 파일 업로드 영역
│   ├── JobList.jsx        ← 공고 매칭 결과 리스트
│   ├── AnalysisResult.jsx ← AI 분석 결과 표시
│   ├── CompanyModal.jsx   ← 기업 상세 모달
│   └── InterviewPrep.jsx  ← 면접 대비 탭
├── hooks/
│   ├── useApi.js          ← API 호출 공통 훅
│   └── useModels.js       ← 모델 목록 로드 훅
└── data/
    └── skills.js          ← 스킬 카테고리 (정적 데이터로 유지)
```

---

## 작업 순서 및 예상 일정

| 순서 | Phase | 핵심 작업 | 예상 소요 |
|------|-------|-----------|-----------|
| 1 | **Phase 2** | 프롬프트 파일 분리 (의존성 없음, 단독 작업) | 30분 |
| 2 | **Phase 1** | Gemini 모델 개편 + 모델 레지스트리 | 1시간 |
| 3 | **Phase 3** | RAG 데이터 구조 + API + 프론트엔드 전환 | 1.5시간 |
| 4 | 병행 | App.jsx 컴포넌트 분리 (Phase 1~3 작업 중 자연스럽게) | 포함 |
| 5 | 병행 | 장기 확장 스텁/인터페이스 정의 | 포함 |

> **총 예상 소요**: 약 3시간

---

## 참고 자료

- [Google Gemini API 모델 문서](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API Release Notes](https://ai.google.dev/gemini-api/docs/changelog)
- 현재 프로젝트 `gemini-2.0-flash` → 2026.06.01 퇴역 예정
