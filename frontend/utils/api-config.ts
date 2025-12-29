/**
 * API Configuration Center
 * Used to manage backend API URLs for the frontend
 */

// Production API URL
const PROD_API_URL = 'https://api.agentrix.top';

// Development API URL
const DEV_API_URL = 'http://localhost:3001';

// Automatically select API base path based on environment
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? PROD_API_URL 
  : DEV_API_URL;

// Export module paths
export const API_ENDPOINTS = {
  ADMIN_AUTH: '/api/admin/auth',
  ADMIN_STATS: '/api/admin/stats',
  DEVELOPERS: '/api/admin/developers',
  FUND_PATHS: '/api/admin/fund-paths',
  MARKETING: '/api/admin/marketing',
};
