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

  // Order & Product ID Generation
  ATTACHMENTS: {
    UPLOAD: '/api/v1/Attachment/upload',
    DOWNLOAD: (path: string) => `/api/v1/Attachment/download?path=${encodeURIComponent(path)}`,
  },
  
  ORDERS: {
    GENERATE: '/api/v1/orderid/order',
    GENERATE_WITH_ITEMS: '/api/v1/orderid/orderwithitems',
    HISTORY: '/api/v1/orderid/history',
    GET_BY_ID: (orderId: string) => `/api/v1/orderid/${orderId}`,
    UPDATE: (orderId: string) => `/api/v1/orderid/order/${orderId}`,
  },
  
  PRODUCTS: {
    GENERATE: '/api/v1/orderid/product',
  },

  // Catalog & Media
  CATALOG: {
    MEDIA: '/catalog/media',
    THUMBNAIL: (mediaId: string) => `/catalog/media/${mediaId}/thumbnail`,
    FAVORITE: (listingId: string) => `/catalog/listings/${listingId}/favorite`,
  },
};
