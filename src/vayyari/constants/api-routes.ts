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
  }
};
