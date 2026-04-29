import { z } from 'zod';
import { supabase } from '../supabase/client.js';

export const searchProductsSchema = z.object({
  query: z.string().describe('검색할 상품명 또는 자연어 키워드'),
  category: z.string().optional().describe('카테고리 필터 (electronics, clothing, food 등)'),
  limit: z.number().optional().default(5).describe('반환할 최대 상품 수 (기본 5)'),
});

export type SearchProductsInput = z.infer<typeof searchProductsSchema>;

export async function searchProducts(input: SearchProductsInput) {
  const { query, category, limit } = input;

  let dbQuery = supabase
    .from('products')
    .select('id, name, description, price, category, stock')
    .ilike('name', `%${query}%`)
    .gt('stock', 0)
    .limit(limit ?? 5);

  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }

  const { data, error } = await dbQuery;

  if (error) throw new Error(`상품 검색 실패: ${error.message}`);
  if (!data || data.length === 0) {
    return { results: [], message: `"${query}"에 해당하는 상품을 찾지 못했습니다.` };
  }

  return {
    results: data,
    message: `"${query}" 검색 결과 ${data.length}건`,
  };
}
