/**
 * HTTP Client tests
 */

import axios from 'axios';
import { AgentrixClient } from '../src/client';
import { AgentrixConfig } from '../src/types/common';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AgentrixClient', () => {
  let client: AgentrixClient;
  const config: AgentrixConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'http://localhost:3001/api',
    timeout: 30000,
    retries: 3,
  };

  let mockedInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      defaults: {
        headers: {
          common: {},
          Authorization: '',
        },
        baseURL: '',
      },
      get: jest.fn(),
      post: jest.fn(),
    };
    (mockedAxios.create as jest.Mock).mockReturnValue(mockedInstance);
    client = new AgentrixClient(config);
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
      mockedInstance.get.mockResolvedValue(mockData);

      const result = await client.get('/test');

      expect(mockedInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('post', () => {
    it('should make POST request', async () => {
      const mockData = { id: '123' };
      const requestData = { name: 'test' };
      mockedInstance.post.mockResolvedValue(mockData);

      const result = await client.post('/test', requestData);

      expect(mockedInstance.post).toHaveBeenCalledWith('/test', requestData, undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('setApiKey', () => {
    it('should update API key', () => {
      const newApiKey = 'new-api-key';
      client.setApiKey(newApiKey);

      expect(mockedInstance.defaults.headers['Authorization']).toBe(`Bearer ${newApiKey}`);
    });
  });

  describe('setBaseURL', () => {
    it('should update base URL', () => {
      const newBaseURL = 'https://api.example.com';
      client.setBaseURL(newBaseURL);

      expect(mockedInstance.defaults.baseURL).toBe(newBaseURL);
    });
  });
});

