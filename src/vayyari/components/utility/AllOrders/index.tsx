import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { OrderIdEntry, PaymentMode, OrderSource } from '@/types/orders';
import {
  AllOrdersPage,
  OrderSortOption,
  OrderSourceFilter,
  PaymentModeFilter,
  DeletedFilter,
} from '@/components/tamagui-ui/pages/AllOrdersPage';
import { OrderIdHistoryEntry } from '@/components/tamagui-ui/molecules/OrderIdHistoryItem';

interface PagedOrderApiResponse {
  items: OrderIdEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export const AllOrders = () => {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderIdHistoryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<OrderSortOption>('date_desc');
  const [sourceFilter, setSourceFilter] = useState<OrderSourceFilter>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<PaymentModeFilter>('all');
  const [deletedFilter, setDeletedFilter] = useState<DeletedFilter>('active');

  const mapToHistoryEntry = (item: OrderIdEntry): OrderIdHistoryEntry => ({
    id: item.id,
    source:
      item.source?.toLowerCase() === 'whatsapp'
        ? 'whatsapp'
        : item.source?.toLowerCase() === 'instagram'
        ? 'instagram'
        : item.source || 'None',
    paymentMode:
      item.paymentMode && item.paymentMode !== 'None'
        ? (item.paymentMode.toLowerCase() as 'cod' | 'prepaid')
        : null,
    timestamp: item.timestamp,
    customerPhone: item.customerPhone,
    instagramHandle: item.instagramHandle,
    sourceHandle: item.sourceHandle || item.customerPhone || item.instagramHandle,
    isDeleted: item.isDeleted,
  });

  const fetchOrders = useCallback(
    async (pageToFetch: number, isAppend: boolean = false, query: string = searchQuery, sort: OrderSortOption = sortBy, src: OrderSourceFilter = sourceFilter, pay: PaymentModeFilter = paymentModeFilter, del: DeletedFilter = deletedFilter) => {
      try {
        if (isAppend) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        const sortParts = sort.split('_');
        const sortField = sortParts[0] === 'id' ? 'orderId' : sortParts[0] === 'name' ? 'customerName' : 'date';
        const sortOrder = sortParts[1] || 'desc';

        const params: Record<string, any> = {
          page: pageToFetch,
          limit: 20,
          sortBy: sortField,
          sortOrder,
          showDeleted: del !== 'active',
        };

        if (query.trim()) params.q = query.trim();
        if (src !== 'all') {
          params.source = src === 'whatsapp' ? 'WhatsApp' : src === 'instagram' ? 'Instagram' : 'None';
        }
        if (pay !== 'all') {
          params.paymentMode = pay === 'cod' ? 'COD' : 'Prepaid';
        }

        const response = await searchApiClient.get<PagedOrderApiResponse>(API_ROUTES.ORDERS.ALL, {
          params,
        });

        if (response && response.items) {
          const mapped = response.items.map(mapToHistoryEntry);
          let filteredMapped = mapped;
          if (del === 'deleted') {
            filteredMapped = mapped.filter((x) => x.isDeleted);
          }

          if (isAppend) {
            setOrders((prev) => [...prev, ...filteredMapped]);
          } else {
            setOrders(filteredMapped);
          }

          setTotalCount(response.totalCount || 0);
          setHasMore(response.hasMore || false);
          setPage(pageToFetch);
        }
      } catch (error) {
        console.error('[AllOrders] Failed to fetch orders API:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [searchQuery, sortBy, sourceFilter, paymentModeFilter, deletedFilter]
  );

  useEffect(() => {
    fetchOrders(1, false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders(1, false);
    }, [fetchOrders])
  );

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    fetchOrders(1, false, q, sortBy, sourceFilter, paymentModeFilter, deletedFilter);
  };

  const handleSortChange = (sort: OrderSortOption) => {
    setSortBy(sort);
    fetchOrders(1, false, searchQuery, sort, sourceFilter, paymentModeFilter, deletedFilter);
  };

  const handleSourceFilterChange = (src: OrderSourceFilter) => {
    setSourceFilter(src);
    fetchOrders(1, false, searchQuery, sortBy, src, paymentModeFilter, deletedFilter);
  };

  const handlePaymentModeFilterChange = (pay: PaymentModeFilter) => {
    setPaymentModeFilter(pay);
    fetchOrders(1, false, searchQuery, sortBy, sourceFilter, pay, deletedFilter);
  };

  const handleDeletedFilterChange = (del: DeletedFilter) => {
    setDeletedFilter(del);
    fetchOrders(1, false, searchQuery, sortBy, sourceFilter, paymentModeFilter, del);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      fetchOrders(page + 1, true);
    }
  };

  const handleRefresh = () => {
    fetchOrders(1, false);
  };

  const handleUpdate = async (
    id: string,
    updated: { paymentMode: 'cod' | 'prepaid' | null; sourceHandle: string }
  ) => {
    const existing = orders.find((x) => x.id === id);
    if (!existing) return;

    try {
      const apiPaymentMode: PaymentMode | null =
        updated.paymentMode === 'cod' ? 'COD' : updated.paymentMode === 'prepaid' ? 'Prepaid' : null;

      const isWhatsApp = existing.source?.toLowerCase() === 'whatsapp';
      const phone = isWhatsApp ? updated.sourceHandle : existing.customerPhone;

      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(id), {
        customerPhone: phone,
        sourceHandle: updated.sourceHandle,
        paymentMode: apiPaymentMode,
      });

      setOrders((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                paymentMode: updated.paymentMode,
                sourceHandle: updated.sourceHandle,
                customerPhone: phone,
              }
            : item
        )
      );
    } catch (error) {
      console.error('Failed to update order in AllOrders:', error);
      Alert.alert('Error', 'Failed to update order details.');
    }
  };

  const copyToClipboard = async (id: string, includePrefix: boolean = false) => {
    const textToCopy = includePrefix ? `order id # ${id}` : id;
    await Clipboard.setStringAsync(textToCopy);
  };

  return (
    <AllOrdersPage
      orders={orders}
      totalCount={totalCount}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      searchQuery={searchQuery}
      sortBy={sortBy}
      sourceFilter={sourceFilter}
      paymentModeFilter={paymentModeFilter}
      deletedFilter={deletedFilter}
      onSearchChange={handleSearchChange}
      onSortChange={handleSortChange}
      onSourceFilterChange={handleSourceFilterChange}
      onPaymentModeFilterChange={handlePaymentModeFilterChange}
      onDeletedFilterChange={handleDeletedFilterChange}
      onLoadMore={handleLoadMore}
      onRefresh={handleRefresh}
      onUpdateOrder={handleUpdate}
      onCopy={copyToClipboard}
      onNavigateToDetails={(id) => router.push(`/utilities/order-details/${id}`)}
      onBack={() => router.back()}
    />
  );
};
