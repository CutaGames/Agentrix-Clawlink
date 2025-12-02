/**
 * HTTP Client tests
 */

import axios from 'axios';
import { PayMindClient } from '../src/client';
import { PayMindConfig } from '../src/types/common';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PayMindClient', () => {
  let client: PayMindClient;
  const config: PayMindConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'http://localhost:3001/api',
    timeout: 30000,
    retries: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new PayMindClient(config);
    (mockedAxios.create as jest.Mock).mockReturnValue(mockedAxios);
  });

  describe('constructor', () => {
    it('should create client with config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: config.baseUrl,
        timeout: config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });
    });
  });

  describe('get', () => {
    it('should make GET request', async () => {
      const mockData = { id: '123', name: 'test' };
      (mockedAxios.get as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await client.get('/test');

      expect(mockedAxios.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('post', () => {
    it('should make POST request', async () => {
      const mockData = { id: '123' };
      const requestData = { name: 'test' };
      (mockedAxios.post as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await client.post('/test', requestData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/test', requestData, undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('setApiKey', () => {
    it('should update API key', () => {
      const newApiKey = 'new-api-key';
      client.setApiKey(newApiKey);

      expect(mockedAxios.defaults.headers['Authorization']).toBe(`Bearer ${newApiKey}`);
    });
  });

  describe('setBaseURL', () => {
    it('should update base URL', () => {
      const newBaseURL = 'https://api.example.com';
      client.setBaseURL(newBaseURL);

      expect(mockedAxios.defaults.baseURL).toBe(newBaseURL);
    });
  });
});

