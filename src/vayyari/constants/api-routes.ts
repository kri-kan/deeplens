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
  ORDERS: {
    GENERATE: '/api/v1/orderid/order',
    GENERATE_WITH_ITEMS: '/api/v1/orderid/orderwithitems',
    HISTORY: '/api/v1/orderid/history',
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
