import { productMgmtApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';
import { productService } from './productService';
import type { VendorProduct } from '../types/products';

export type AnalyticsTimeframe = '7d' | '30d' | '90d' | 'all';

export interface DailyCreationPoint {
  date: string;         // 'YYYY-MM-DD'
  displayDate: string;  // e.g. 'Aug 22' or 'Mon'
  totalCreated: number;
  starredCount: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface PriceTierDistribution {
  tier: string;
  minPrice: number;
  maxPrice?: number;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  timeframe: AnalyticsTimeframe;
  totalProducts: number;
  totalStarred: number;
  curationRate: number; // percentage, e.g. 28.5
  totalCatalogValue: number;
  averagePrice: number;
  dailyTrends: DailyCreationPoint[];
  categories: CategoryDistribution[];
  priceTiers: PriceTierDistribution[];
  topVendors?: { name: string; count: number }[];
}

export class AnalyticsService {
  /**
   * Fetches the analytics summary for the specified timeframe.
   * Calls the backend aggregation endpoint with automatic fallback to client-side aggregation.
   */
  async getAnalyticsSummary(timeframe: AnalyticsTimeframe = '7d'): Promise<AnalyticsSummary> {
    try {
      const response = await productMgmtApiClient.get<AnalyticsSummary>(
        `${API_ROUTES.ANALYTICS.PRODUCTS_SUMMARY}?timeframe=${timeframe}`
      );
      if (response && response.dailyTrends && response.dailyTrends.length > 0) {
        return response;
      }
    } catch (err) {
      console.warn('[AnalyticsService] Backend aggregation unavailable, calculating client-side fallback:', err);
    }

    return this.calculateClientFallback(timeframe);
  }

  /**
   * Aggregates catalog items client-side as a high-fidelity fallback.
   */
  private async calculateClientFallback(timeframe: AnalyticsTimeframe): Promise<AnalyticsSummary> {
    try {
      // Fetch catalog items for aggregation
      const catalogResult = await productService.getCatalog({ take: 1000 });
      const products = catalogResult?.products || [];

      // Determine date cutoff based on timeframe
      const now = new Date();
      let daysCount = 7;
      if (timeframe === '30d') daysCount = 30;
      else if (timeframe === '90d') daysCount = 90;
      else if (timeframe === 'all') daysCount = 365;

      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - daysCount);
      cutoffDate.setHours(0, 0, 0, 0);

      // Filter products by timeframe if not 'all'
      const filteredProducts = products.filter(p => {
        if (timeframe === 'all') return true;
        if (!p.createdAt) return true;
        const pDate = new Date(p.createdAt);
        return pDate >= cutoffDate;
      });

      // KPI Calculations
      const totalProducts = filteredProducts.length;
      const starredProducts = filteredProducts.filter(p => p.isStarred);
      const totalStarred = starredProducts.length;
      const curationRate = totalProducts > 0 ? Number(((totalStarred / totalProducts) * 100).toFixed(1)) : 0;

      let totalValue = 0;
      let validPriceCount = 0;
      filteredProducts.forEach(p => {
        if (p.vendorPrice && p.vendorPrice > 0) {
          totalValue += p.vendorPrice;
          validPriceCount++;
        }
      });
      const averagePrice = validPriceCount > 0 ? Math.round(totalValue / validPriceCount) : 0;

      // Build continuous daily trend buckets localized to IST
      const dailyBuckets: Map<string, { total: number; starred: number }> = new Map();

      const effectiveDays = timeframe === 'all' ? Math.min(daysCount, 30) : daysCount;
      for (let i = effectiveDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = this.formatDateKey(d);
        dailyBuckets.set(key, { total: 0, starred: 0 });
      }

      filteredProducts.forEach(p => {
        if (!p.createdAt) return;
        const pDate = new Date(p.createdAt);
        const key = this.formatDateKey(pDate);
        const bucket = dailyBuckets.get(key);
        if (bucket) {
          bucket.total++;
          if (p.isStarred) bucket.starred++;
        } else if (timeframe === 'all' && dailyBuckets.has(key)) {
          const b = dailyBuckets.get(key)!;
          b.total++;
          if (p.isStarred) b.starred++;
        }
      });

      const dailyTrends: DailyCreationPoint[] = Array.from(dailyBuckets.entries()).map(([dateStr, counts]) => {
        const d = new Date(dateStr);
        const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          date: dateStr,
          displayDate,
          totalCreated: counts.total,
          starredCount: counts.starred,
        };
      });

      // Category breakdown
      const catCountMap: Record<string, number> = {};
      filteredProducts.forEach(p => {
        const rawCat = p.category || 'General';
        const normalized = rawCat.trim().charAt(0).toUpperCase() + rawCat.trim().slice(1).toLowerCase();
        catCountMap[normalized] = (catCountMap[normalized] || 0) + 1;
      });

      const categories: CategoryDistribution[] = Object.entries(catCountMap)
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalProducts > 0 ? Number(((count / totalProducts) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Price Tiers breakdown
      const priceTiersDef = [
        { tier: '< ₹1,000', minPrice: 0, maxPrice: 999 },
        { tier: '₹1,000 - ₹2,500', minPrice: 1000, maxPrice: 2500 },
        { tier: '₹2,500 - ₹5,000', minPrice: 2501, maxPrice: 5000 },
        { tier: '> ₹5,000', minPrice: 5001, maxPrice: undefined },
      ];

      const priceTiers: PriceTierDistribution[] = priceTiersDef.map(def => {
        const count = filteredProducts.filter(p => {
          const price = p.vendorPrice || 0;
          if (def.maxPrice !== undefined) {
            return price >= def.minPrice && price <= def.maxPrice;
          }
          return price >= def.minPrice;
        }).length;

        return {
          tier: def.tier,
          minPrice: def.minPrice,
          maxPrice: def.maxPrice,
          count,
          percentage: totalProducts > 0 ? Number(((count / totalProducts) * 100).toFixed(1)) : 0,
        };
      });

      return {
        timeframe,
        totalProducts,
        totalStarred,
        curationRate,
        totalCatalogValue: totalValue,
        averagePrice,
        dailyTrends,
        categories,
        priceTiers,
      };
    } catch (fallbackErr) {
      console.error('[AnalyticsService] Error calculating fallback metrics:', fallbackErr);
      return {
        timeframe,
        totalProducts: 0,
        totalStarred: 0,
        curationRate: 0,
        totalCatalogValue: 0,
        averagePrice: 0,
        dailyTrends: [],
        categories: [],
        priceTiers: [],
      };
    }
  }

  private formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export const analyticsService = new AnalyticsService();
