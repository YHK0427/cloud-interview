# Cloud Interview

IT 인프라/클라우드 면접 연습 웹 애플리케이션

실제 면접처럼 음성으로 질문을 듣고, 음성으로 답변하며, AI 피드백을 받을 수 있는 개인용 면접 연습 도구입니다.

![메인 화면](docs/images/01-main.png)

## 주요 기능

- **카테고리 기반 문제 출제** — 네트워크(1~4계층), 웹/HTTP, 도커, 쿠버네티스, 클라우드 아키텍처 등 카테고리를 복수 선택하면 비율에 맞춰 10문제 출제
- **음성 면접** — Gemini TTS로 질문을 읽어주고, Web Speech API(STT)로 답변을 음성 인식 (질문 텍스트는 기본 숨김, 실제 면접처럼 음성으로만 진행)
- **AI 피드백** — 답변 완료 후 모범 답안 확인 + Gemini API로 점수/잘한 점/부족한 점/보완 제안 피드백 생성
- **히스토리** — 회차별 면접 기록(질문, 내 답변, 모범 답안, 피드백) 조회

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Flask, SQLAlchemy |
| Frontend | Jinja2, Vanilla JS |
| Database | MySQL 8.0 |
| TTS | Gemini 2.5 Flash TTS |
| STT | Web Speech API (Chrome) |
| AI 피드백 | Gemini 2.5 Flash |
| Infra | Docker Compose |

## 프로젝트 구조

```
├── docker-compose.yml
├── .env                          # 환경변수 (Gemini API 키)
├── flask/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                    # Flask 앱 진입점
│   ├── config.py                 # DB, API 설정
│   ├── models.py                 # SQLAlchemy 모델
│   ├── routes/
│   │   ├── main.py               # 메인 페이지, 카테고리, 면접 시작
│   │   ├── interview.py          # 면접 진행, TTS, 답변 저장, 피드백
│   │   └── history.py            # 히스토리 조회
│   ├── services/
│   │   └── gemini_service.py     # Gemini API 피드백 생성
│   ├── templates/                # Jinja2 HTML 템플릿
│   └── static/                   # CSS, JS
└── mysql/
    ├── 01_schema.sql             # 테이블 생성
    └── 02_seed.sql               # 초기 질문 데이터 (79문제)
```

## 실행 방법

### 1. 사전 준비

- Docker Desktop 설치 및 실행
- [Google AI Studio](https://aistudio.google.com/)에서 Gemini API 키 발급

### 2. 환경변수 설정

`.env` 파일을 프로젝트 루트에 생성:

```env
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=interview_db
GEMINI_API_KEY=여기에_본인_API키_입력
```

### 3. 실행

```bash
docker-compose up --build
```

### 4. 접속

브라우저에서 `http://localhost:5000` 접속 (Chrome 권장 — STT 지원)

## 데이터베이스

### questions 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT (PK) | 질문 ID |
| question | TEXT | 질문 내용 |
| model_answer | TEXT | 모범 답안 |
| category | VARCHAR(50) | 카테고리 |

### answers 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT (PK) | 답변 ID |
| question_id | INT (FK) | 질문 참조 |
| answer | TEXT | 사용자 답변 |
| feedback | TEXT | AI 피드백 |
| session_no | INT | 회차 번호 |

### 질문 추가

```sql
INSERT INTO questions (question, model_answer, category) VALUES
('질문 내용', '모범 답안 내용', '카테고리명');
```

## 카테고리 목록 (초기 데이터 기준)

- 네트워크(1계층) ~ 네트워크(4계층)
- 네트워크(2/3/4계층 공통)
- 네트워크(기타)
- 웹/HTTP
- 도커(기본/이미지)
- 도커(네트워크/운영)
- 쿠버네티스(아키텍처/컨트롤러)
- 쿠버네티스(네트워크/보안)
- 클라우드(고가용성/보안)
- 클라우드(마이그레이션/비용)

## 사용자 가이드

### Step 1. 카테고리 선택

원하는 카테고리를 복수 선택한 뒤 **면접 시작** 버튼을 클릭합니다.
선택한 카테고리 비율에 맞춰 총 10문제가 랜덤 출제됩니다.

![카테고리 선택](docs/images/02-category-select.png)

### Step 2. 면접 진행

면접이 시작되면 질문 텍스트는 숨겨져 있습니다. 실제 면접처럼 **질문 듣기** 버튼을 눌러 음성으로 질문을 듣고, **답변하기** 버튼을 눌러 음성으로 답변합니다.

![면접 진행 - 음성 모드](docs/images/03-interview.png)

필요시 **질문 텍스트 보기** 버튼으로 질문 내용을 확인할 수 있습니다.

![면접 진행 - 텍스트 공개](docs/images/04-interview-revealed.png)

### Step 3. 답변 확인 및 피드백

**답변 완료** 후 모범 답안을 확인하고, **피드백 보기** 버튼으로 AI 피드백(점수, 잘한 점, 부족한 점, 보완 제안)을 받습니다.

![답변 결과 및 모범 답안](docs/images/05-answer-result.png)

![AI 피드백](docs/images/06-feedback.png)

### Step 4. 히스토리 확인

메뉴의 **히스토리**에서 과거 면접 기록을 회차별로 조회할 수 있습니다.

![히스토리 목록](docs/images/07-history.png)

각 회차를 클릭하면 질문별 내 답변, 모범 답안, AI 피드백을 다시 확인할 수 있습니다.

![히스토리 상세](docs/images/08-history-detail.png)
