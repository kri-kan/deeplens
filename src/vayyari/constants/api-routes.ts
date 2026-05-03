/**
 * Centralized API route definitions for the Vayyari app.
 * This ensures a single source of truth for all backend endpoints.
 */
export const API_ROUTES = {
  // Authentication & Identity
  AUTH: {
    LOGIN: '/connect/token',
    PROFILE: '/api/auth/me',
  },

  // Attachment management
  ATTACHMENTS: {
    UPLOAD: '/api/v1/Attachment/upload',
    DOWNLOAD: (path: string) => `/api/v1/Attachment/download?path=${encodeURIComponent(path)}`,
  },

  // Order & ID generation
  ORDERS: {
    GENERATE: '/api/v1/orderid/order',
    GENERATE_WITH_ITEMS: '/api/v1/orderid/orderwithitems',
    HISTORY: '/api/v1/orderid/history',
    GET_BY_ID: (orderId: string) => `/api/v1/orderid/${orderId}`,
    UPDATE: (orderId: string) => `/api/v1/orderid/order/${orderId}`,
  },

  // Product ID generation (separate concern from catalog CRUD)
  PRODUCT_IDS: {
    GENERATE: '/api/v1/orderid/product',
  },

  // Product catalog CRUD (backed by ProductsController)
  PRODUCT_CATALOG: {
    LIST:   '/api/v1/products',
    CREATE: '/api/v1/products',
    MERGE:  '/api/v1/products/merge',
    GET_BY_ID: (id: string) => `/api/v1/products/${id}`,
  },

  // Catalog & Media (legacy search/ingest flow)
  CATALOG: {
    MEDIA: '/api/v1/catalog/media',
    THUMBNAIL: (mediaId: string) => `/api/v1/catalog/media/${mediaId}/thumbnail`,
    FAVORITE: (listingId: string) => `/api/v1/catalog/listings/${listingId}/favorite`,
  },
  
  // Media processing & retention settings (Hierarchical)
  MEDIA_SETTINGS: {
    GET_ALL: '/api/v1/media/settings',
    UPSERT: '/api/v1/media/settings',
    DELETE: (id: string) => `/api/v1/media/settings/${id}`,
    LOOKUP: (category: string, subCategory?: string) => 
      `/api/v1/media/settings/lookup?category=${category}${subCategory ? `&subcategory=${subCategory}` : ''}`,
    RETENTION_OPTIONS: '/api/v1/media/settings/retention-options',
    SCHEMA: '/api/v1/media/settings/schema',
  },

  // Customer Management
  CUSTOMERS: {
    LIST: '/api/v1/customers',
    DETAIL: (id: string) => `/api/v1/customers/${id}`,
    UPSERT: '/api/v1/customers',
    DELETE: (id: string) => `/api/v1/customers/${id}`,
    ADDRESSES: (id: string) => `/api/v1/customers/${id}/addresses`,
    UPDATE_ADDRESS: (id: string) => `/api/v1/customers/addresses/${id}`,
    DELETE_ADDRESS: (id: string) => `/api/v1/customers/addresses/${id}`,
    SET_DEFAULT_ADDRESS: (customerId: string, addressId: string) => `/api/v1/customers/${customerId}/addresses/${addressId}/default`,
  },

  // WhatsApp communication (Specific implementation)
  WHATSAPP: {
    CHANNELS: '/api/v1/whatsapp/channels',
    DELETE_CHANNEL: (id: string) => `/api/v1/whatsapp/channels/${id}`,
    SUBSCRIBERS: (id: string) => `/api/v1/whatsapp/channels/${id}/subscribers`,
    MEMBERSHIPS: (customerId: string) => `/api/v1/whatsapp/customers/${customerId}/memberships`,
    SUBSCRIBE: (customerId: string, channelId: string) => `/api/v1/whatsapp/customers/${customerId}/subscribe/${channelId}`,
    UNSUBSCRIBE: (customerId: string, channelId: string) => `/api/v1/whatsapp/customers/${customerId}/unsubscribe/${channelId}`,
  },

  // Generic Communication & Broadcast
  COMMUNICATION: {
    CHANNELS: '/api/v1/communication/broadcast/channels',
    CHANNEL_DETAIL: (id: string) => `/api/v1/communication/broadcast/channels/${id}`,
    CHANNEL_TYPES: '/api/v1/communication/broadcast/channel-types',
    PURPOSES: '/api/v1/communication/broadcast/purposes',
    PURPOSES_DETAILED: '/api/v1/communication/broadcast/purposes/detailed',
    PURPOSE_CHANNELS: (purposeKey: string) => `/api/v1/communication/broadcast/purposes/${purposeKey}/channels`,
    UNLINKED_CHANNELS: (purposeKey: string) => `/api/v1/communication/broadcast/purposes/${purposeKey}/unlinked-channels`,
    ADD_TO_PURPOSE: (purposeKey: string, channelId: string) => `/api/v1/communication/broadcast/purposes/${purposeKey}/channels/${channelId}`,
    REMOVE_FROM_PURPOSE: (purposeKey: string, channelId: string) => `/api/v1/communication/broadcast/purposes/${purposeKey}/channels/${channelId}`,
    PURPOSE_CUSTOMERS: (purposeKey: string) => `/api/v1/communication/broadcast/purposes/${purposeKey}/customers`,
    UNASSIGNED_CUSTOMERS: (purposeKey: string) => `/api/v1/communication/broadcast/purposes/${purposeKey}/unassigned-customers`,
    DISTRIBUTE: (purposeKey: string) => `/api/v1/communication/broadcast/purposes/${purposeKey}/distribute`,
  },

  // Common / Master Data
  COMMON: {
    COUNTRY_CODES: '/api/v1/country/codes',
  },

  // System & Background Jobs
  SYSTEM_JOBS: {
    LIST: '/api/v1/system-jobs',
    ORPHANED_COUNT: '/api/v1/system-jobs/orphaned-media/count',
    CLEANUP: '/api/v1/system-jobs/cleanup-media',
  }
};
