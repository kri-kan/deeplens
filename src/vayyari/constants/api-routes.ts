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
    LIST:   '/api/products',
    CREATE: '/api/products',
    MERGE:  '/api/products/merge',
    GET_BY_ID: (id: string) => `/api/products/${id}`,
  },

  // Catalog & Media (legacy search/ingest flow)
  CATALOG: {
    MEDIA: '/catalog/media',
    THUMBNAIL: (mediaId: string) => `/catalog/media/${mediaId}/thumbnail`,
    FAVORITE: (listingId: string) => `/catalog/listings/${listingId}/favorite`,
  },
  
  // Media processing & retention settings (Hierarchical)
  MEDIA_SETTINGS: {
    GET_ALL: '/api/media/settings',
    UPSERT: '/api/media/settings',
    DELETE: (id: string) => `/api/media/settings/${id}`,
    LOOKUP: (category: string, subCategory?: string) => 
      `/api/media/settings/lookup?category=${category}${subCategory ? `&subcategory=${subCategory}` : ''}`,
    RETENTION_OPTIONS: '/api/media/settings/retention-options',
    SCHEMA: '/api/media/settings/schema',
  }
};
