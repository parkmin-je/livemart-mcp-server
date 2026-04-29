import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

import { searchProducts } from './tools/search-products.js';
import { getRecommendations } from './tools/get-recommendations.js';
import { analyzeSales } from './tools/analyze-sales.js';

try {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
} catch {
  // 환경변수가 이미 주입된 경우 무시
}

const server = new McpServer({
  name: 'livemart-mcp-server',
  version: '1.0.0',
});

server.tool(
  'search_products',
  '자연어로 LiveMart 상품을 검색합니다. 상품명, 카테고리, 키워드로 재고 있는 상품을 조회합니다.',
  {
    query: z.string().describe('검색할 상품명 또는 자연어 키워드'),
    category: z.string().describe('카테고리 필터 (electronics, clothing, food 등). 없으면 빈 문자열').optional(),
    limit: z.number().describe('반환할 최대 상품 수 (기본 5)').optional(),
  },
  async ({ query, category, limit }) => {
    const result = await searchProducts({ query, category, limit });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_recommendations',
  '특정 상품 ID를 기준으로 같은 카테고리의 유사 상품을 추천합니다.',
  {
    product_id: z.string().describe('기준 상품 UUID'),
    limit: z.number().describe('추천 상품 수 (기본 3)').optional(),
  },
  async ({ product_id, limit }) => {
    const result = await getRecommendations({ product_id, limit });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'analyze_sales',
  'AI 판매자 에이전트가 상품의 가격 경쟁력, 재고 상태, 카테고리 포지셔닝을 분석해 판매 전략을 제안합니다.',
  {
    product_id: z.string().describe('분석할 상품 UUID'),
  },
  async ({ product_id }) => {
    const result = await analyzeSales({ product_id });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LiveMart MCP Server 시작됨 (stdio)');
}

main().catch(console.error);
