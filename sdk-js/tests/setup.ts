/**
 * Test setup file
 */

// Mock environment variables
process.env.AGENTRIX_API_KEY = 'test-api-key';
process.env.AGENTRIX_API_URL = 'http://localhost:3001/api';

// Increase timeout for integration tests
jest.setTimeout(30000);

