import { z } from 'zod';
import { supabase } from '../supabase/client.js';

export const getRecommendationsSchema = z.object({
  product_id: z.string().uuid().describe('기준 상품 UUID'),
  limit: z.number().optional().default(3).describe('추천 상품 수 (기본 3)'),
});

export type GetRecommendationsInput = z.infer<typeof getRecommendationsSchema>;

export async function getRecommendations(input: GetRecommendationsInput) {
  const { product_id, limit } = input;

  const { data: baseProduct, error: baseError } = await supabase
    .from('products')
    .select('id, name, category, price')
    .eq('id', product_id)
    .single();

  if (baseError || !baseProduct) {
    throw new Error(`상품을 찾을 수 없습니다: ${product_id}`);
  }

  const { data: similar, error } = await supabase
    .from('products')
    .select('id, name, description, price, category, stock')
    .eq('category', baseProduct.category)
    .neq('id', product_id)
    .gt('stock', 0)
    .order('price', { ascending: true })
    .limit(limit ?? 3);

  if (error) throw new Error(`추천 상품 조회 실패: ${error.message}`);

  return {
    base_product: baseProduct,
    recommendations: similar ?? [],
    message: `"${baseProduct.name}" 기반 추천 ${similar?.length ?? 0}건`,
  };
}
