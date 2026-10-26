import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getSearchApiUrl } from '@/utils/api-config';
import { identityService } from '@/services/identity.service';
import { VendorProduct } from '@/types/products';
import { ProductCatalogFilters } from '@/hooks/useProductCatalog';
import { markStarToggled } from '../slices/catalogUiSlice';

export interface CatalogResponse {
  products: VendorProduct[];
  totalCount: number;
}

export interface FilterOptionsResponse {
  fabrics: string[];
  crafts?: string[];
  motifs?: string[];
  borders?: string[];
  stitchTypes?: string[];
  occasions?: string[];
  vendors: string[];
  minPrice: number;
  maxPrice: number;
}

export const catalogApi = createApi({
  reducerPath: 'catalogApi',
  baseQuery: fetchBaseQuery({
    baseUrl: getSearchApiUrl(),
    prepareHeaders: async (headers) => {
      try {
        const token = await identityService.getAccessTokenWithRefresh();
        if (token) {
          headers.set('authorization', `Bearer ${token}`);
        }
      } catch (err) {
        console.warn('[catalogApi] Failed to acquire auth token for query:', err);
      }
      return headers;
    },
  }),
  tagTypes: ['Catalog', 'FilterOptions'],
  endpoints: (builder) => ({
    // 1. Fetch Paginated & Filtered Catalog
    getCatalog: builder.query<
      CatalogResponse,
      { filters: ProductCatalogFilters; skip?: number; take?: number }
    >({
      query: ({ filters, skip = 0, take = 100 }) => {
        const searchParams = new URLSearchParams();
        if (filters.categoryId && filters.categoryId !== 'all') {
          searchParams.append('category', filters.categoryId);
        }
        if (filters.sortBy) searchParams.append('sortBy', filters.sortBy);
        searchParams.append('skip', String(skip));
        searchParams.append('take', String(take));
        if (filters.query) searchParams.append('query', filters.query);
        if (filters.startDate) searchParams.append('startDate', filters.startDate);
        if (filters.endDate) searchParams.append('endDate', filters.endDate);
        if (filters.minPrice !== undefined) searchParams.append('minPrice', String(filters.minPrice));
        if (filters.maxPrice !== undefined) searchParams.append('maxPrice', String(filters.maxPrice));
        if (filters.status) {
          searchParams.append('status', filters.status);
        } else if (filters.includeArchived !== undefined && filters.includeArchived !== null) {
          searchParams.append('includeArchived', String(filters.includeArchived));
        }
        if (filters.isStarred !== undefined && filters.isStarred !== null) {
          searchParams.append('isStarred', String(filters.isStarred));
        }

        filters.fabrics?.forEach((f) => searchParams.append('fabrics', f));
        filters.crafts?.forEach((c) => searchParams.append('crafts', c));
        filters.motifs?.forEach((m) => searchParams.append('motifs', m));
        filters.borders?.forEach((b) => searchParams.append('borders', b));
        filters.stitchTypes?.forEach((s) => searchParams.append('stitchTypes', s));
        filters.occasions?.forEach((o) => searchParams.append('occasions', o));
        filters.blouseTypes?.forEach((bt) => searchParams.append('blouseTypes', bt));
        filters.vendorNames?.forEach((v) => searchParams.append('vendorNames', v));
        filters.categories?.forEach((c) => searchParams.append('categories', c));

        return `/api/v1/products/catalog?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.products.map(({ id }) => ({ type: 'Catalog' as const, id })),
              { type: 'Catalog', id: 'LIST' },
            ]
          : [{ type: 'Catalog', id: 'LIST' }],
    }),

    // 2. Filter Options metadata
    getFilterOptions: builder.query<FilterOptionsResponse, void>({
      query: () => '/api/v1/products/catalog/filter-options',
      providesTags: ['FilterOptions'],
    }),

    // 3. Toggle Star Mutation with Instantaneous (<16ms) Optimistic Update & Auto-Rollback
    toggleProductStar: builder.mutation<void, { productId: string; isStarred: boolean }>({
      query: ({ productId, isStarred }) => ({
        url: `/api/v1/catalog/products/${productId}/star`,
        method: 'PATCH',
        body: { isStarred },
      }),
      async onQueryStarted({ productId, isStarred }, { dispatch, queryFulfilled, getState }) {
        // Mark as session-modified so active filters don't abruptly prune the tile
        dispatch(markStarToggled(productId));

        // Optimistically patch every getCatalog entry currently in cache that contains this product
        const patchResults: any[] = [];
        const state: any = getState();
        const queries = state.catalogApi?.queries || {};

        for (const [queryKey, querySubstate] of Object.entries(queries)) {
          if (queryKey.startsWith('getCatalog(') && (querySubstate as any)?.data) {
            const originalArgs = (querySubstate as any).originalArgs;
            patchResults.push(
              dispatch(
                catalogApi.util.updateQueryData('getCatalog', originalArgs, (draft) => {
                  const product = draft.products?.find((p) => p.id === productId);
                  if (product) {
                    product.isStarred = isStarred;
                    (product as any).IsStarred = isStarred;
                  }
                })
              )
            );
          }
        }

        try {
          await queryFulfilled;
        } catch (err) {
          console.error('[catalogApi] Failed to toggle star, reverting optimistic changes:', err);
          patchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (_result, _error, { productId }) => [{ type: 'Catalog', id: productId }],
    }),

    // 4. Bulk Archive Mutation
    archiveProducts: builder.mutation<{ count: number }, string[]>({
      query: (productIds) => ({
        url: '/api/v1/products/archive',
        method: 'POST',
        body: productIds,
      }),
      invalidatesTags: [{ type: 'Catalog', id: 'LIST' }],
    }),

    // 5. Bulk Delete Mutation
    deleteProductsBulk: builder.mutation<{ count: number }, string[]>({
      query: (productIds) => ({
        url: '/api/v1/products/bulk',
        method: 'DELETE',
        body: productIds,
      }),
      invalidatesTags: [{ type: 'Catalog', id: 'LIST' }],
    }),

    // 6. Update Product Metadata (Quick Edit)
    updateProductMetadata: builder.mutation<
      void,
      { id: string; price?: number; categoryName?: string; useForTraining?: boolean }
    >({
      query: ({ id, price, categoryName, useForTraining }) => ({
        url: `/api/v1/products/${id}/metadata`,
        method: 'PATCH',
        body: { price, categoryName, useForTraining },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Catalog', id },
        { type: 'Catalog', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCatalogQuery,
  useLazyGetCatalogQuery,
  useGetFilterOptionsQuery,
  useToggleProductStarMutation,
  useArchiveProductsMutation,
  useDeleteProductsBulkMutation,
  useUpdateProductMetadataMutation,
} = catalogApi;
