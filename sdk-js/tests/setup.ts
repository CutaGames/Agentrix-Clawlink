/**
 * Test setup file
 */

// Mock environment variables
process.env.PAYMIND_API_KEY = 'test-api-key';
process.env.PAYMIND_API_URL = 'http://localhost:3001/api';

// Increase timeout for integration tests
jest.setTimeout(30000);

