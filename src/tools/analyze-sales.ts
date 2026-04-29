import { z } from 'zod';
import { supabase } from '../supabase/client.js';

export const analyzeSalesSchema = z.object({
  product_id: z.string().describe('분석할 상품 UUID'),
});

export type AnalyzeSalesInput = z.infer<typeof analyzeSalesSchema>;

export async function analyzeSales(input: AnalyzeSalesInput) {
  const { product_id } = input;

  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, description, price, category, stock')
    .eq('id', product_id)
    .single();

  if (error || !product) {
    throw new Error(`상품을 찾을 수 없습니다: ${product_id}`);
  }

  const { data: categoryProducts } = await supabase
    .from('products')
    .select('price')
    .eq('category', product.category);

  const prices = (categoryProducts ?? []).map((p: { price: number }) => p.price);
  const avgPrice = prices.length > 0
    ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
    : product.price;

  const priceGap = ((product.price - avgPrice) / avgPrice) * 100;

  let priceStrategy = '';
  if (priceGap > 20) {
    priceStrategy = `카테고리 평균(${Math.round(avgPrice).toLocaleString()}원) 대비 ${Math.abs(Math.round(priceGap))}% 높습니다. 프리미엄 포지셔닝이 명확하지 않다면 5~10% 가격 인하 또는 번들 구성을 검토하세요.`;
  } else if (priceGap < -20) {
    priceStrategy = `카테고리 평균(${Math.round(avgPrice).toLocaleString()}원) 대비 ${Math.abs(Math.round(priceGap))}% 낮습니다. 가격 경쟁력이 높으므로 '최저가' 키워드를 강조하고 리뷰 수집에 집중하세요.`;
  } else {
    priceStrategy = `카테고리 평균(${Math.round(avgPrice).toLocaleString()}원)과 유사한 가격대입니다. 차별화 포인트(상세 설명, 이미지, 리뷰)로 경쟁하는 전략이 유효합니다.`;
  }

  let stockStrategy = '';
  if (product.stock <= 10) {
    stockStrategy = `재고 ${product.stock}개로 매우 적습니다. '한정 수량' 문구로 긴급성을 강조하거나, 품절 전 재입고 알림을 설정하세요.`;
  } else if (product.stock <= 30) {
    stockStrategy = `재고 ${product.stock}개로 적정 수준입니다. 현재 판매 속도를 유지하며 추가 마케팅 없이 안정적으로 운영하세요.`;
  } else {
    stockStrategy = `재고 ${product.stock}개로 충분합니다. 묶음 할인이나 기간 한정 프로모션으로 회전율을 높이는 것을 권장합니다.`;
  }

  const rank = prices.filter((p: number) => p < product.price).length + 1;
  const positioningStrategy = `카테고리 내 ${prices.length}개 상품 중 가격 기준 ${rank}위입니다. ${rank <= Math.ceil(prices.length / 3) ? '고가 포지션으로 품질·브랜드 신뢰도를 전면에 내세우세요.' : rank <= Math.ceil(prices.length * 2 / 3) ? '중간 포지션으로 가성비와 품질을 균형 있게 어필하세요.' : '저가 포지션으로 가격 대비 가치를 강조하고 대량 구매 혜택을 제공하세요.'}`;

  return {
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      stock: product.stock,
    },
    market_context: {
      category_avg_price: Math.round(avgPrice),
      price_vs_avg: priceGap > 0 ? `평균 대비 +${Math.round(priceGap)}%` : `평균 대비 ${Math.round(priceGap)}%`,
      category_product_count: prices.length,
    },
    strategy: {
      price: priceStrategy,
      stock: stockStrategy,
      positioning: positioningStrategy,
    },
  };
}
