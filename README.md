# LiveMart MCP Server

**LiveMart AI 판매자 에이전트를 Claude + Supabase 기반으로 재설계한 MCP 서버**

기존 Spring AI + Elasticsearch로 구현한 LiveMart의 AI 기능을 Claude 생태계(MCP)와 연결하여,
Claude가 직접 상품 검색·추천·판매 전략 분석을 수행할 수 있도록 재아키텍처한 프로젝트입니다.

---

## 아키텍처

```
Claude Desktop / Claude Code
        │  MCP Protocol (stdio)
        ▼
┌─────────────────────────────┐
│    livemart-mcp-server      │
│                             │
│  ┌─────────────────────┐   │
│  │  search_products    │   │  ─→  Supabase (products 테이블)
│  │  get_recommendations│   │  ─→  Supabase (category 기반 조회)
│  │  analyze_sales      │   │  ─→  Supabase (시장 데이터) + 룰 엔진
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**기존 LiveMart 아키텍처와 비교**

| 항목 | 기존 (LiveMart) | 재설계 (MCP Server) |
|------|----------------|-------------------|
| 언어 | Java 21 | TypeScript |
| AI 연동 | Spring AI + OpenRouter | MCP Protocol |
| 검색 | Elasticsearch 8 + nori | Supabase Full-text Search |
| DB | PostgreSQL (Neon) | Supabase (PostgreSQL) |
| 배포 | GCP Compute Engine | Claude Desktop / Claude Code |
| 인터페이스 | REST API | MCP Tool |

---

## 제공 툴 (MCP Tools)

### `search_products`
자연어 키워드로 재고 있는 상품을 검색합니다.

```json
{
  "query": "블루투스",
  "category": "electronics",
  "limit": 5
}
```

### `get_recommendations`
특정 상품 기준으로 같은 카테고리의 유사 상품을 추천합니다.

```json
{
  "product_id": "uuid",
  "limit": 3
}
```

### `analyze_sales`
가격 경쟁력·재고 상태·카테고리 포지셔닝을 분석해 판매 전략을 제안합니다.

```json
{
  "product_id": "uuid"
}
```

**응답 예시**
```json
{
  "market_context": {
    "category_avg_price": 86333,
    "price_vs_avg": "평균 대비 +3%"
  },
  "strategy": {
    "price": "카테고리 평균과 유사한 가격대입니다. 차별화 포인트로 경쟁하세요.",
    "stock": "재고 45개로 충분합니다. 묶음 할인으로 회전율을 높이세요.",
    "positioning": "카테고리 내 3개 상품 중 2위. 가성비와 품질을 균형 있게 어필하세요."
  }
}
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 언어 | TypeScript 5.8 |
| MCP SDK | @modelcontextprotocol/sdk 1.10 |
| 데이터베이스 | Supabase (PostgreSQL) |
| 스키마 검증 | Zod 3.24 |
| 런타임 | Node.js 24 |
| 빌드 | tsc |

---

## 의사결정 회고

### 왜 Java → TypeScript인가?
LiveMart는 Spring Boot + Java 21로 구현했지만, MCP SDK의 공식 지원이 TypeScript 중심이고
Claude Code 생태계 자체가 Node.js 기반입니다. 언어 전환을 통해 MCP 프로토콜과의 마찰을 최소화했습니다.

### 왜 Elasticsearch → Supabase Full-text Search인가?
Elasticsearch는 강력하지만 운영 비용이 높고 독립 인프라가 필요합니다.
MCP 서버처럼 빠르게 배포하고 검증하는 컨텍스트에서는 Supabase의 PostgreSQL 내장 검색이
충분한 성능을 제공하면서 인프라 복잡도를 대폭 낮춥니다.
프로덕션 확장 시 pgvector 기반 벡터 검색으로 전환하는 경로를 열어두었습니다.

### 왜 Claude API → 룰 기반 분석인가?
`analyze_sales`는 초기에 Claude API(claude-haiku)를 호출하는 방식으로 설계했습니다.
그러나 MCP 서버가 이미 Claude 위에서 실행되는 구조에서, 내부적으로 다시 Claude API를 호출하는 것은
레이턴시와 비용 측면에서 불필요한 중복입니다. 시장 데이터 기반의 룰 엔진으로 대체하고,
고차원 전략 판단은 Claude 자체가 MCP 응답을 받아 수행하도록 역할을 분리했습니다.

---

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# SUPABASE_URL, SUPABASE_SECRET_KEY 입력

# 3. 빌드
npm run build

# 4. Claude Desktop 연동 (claude_desktop_config.json)
{
  "mcpServers": {
    "livemart-mcp": {
      "command": "node",
      "args": ["<절대경로>/dist/index.js"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_SECRET_KEY": "..."
      }
    }
  }
}
```

---

## 관련 프로젝트

- [LiveMart MSA 이커머스](https://github.com/parkmin-je/livemart-msa-ecommerce) — 이 MCP 서버의 원본 시스템 (Java 21 · Spring Boot 3.4 · 7개 마이크로서비스)
