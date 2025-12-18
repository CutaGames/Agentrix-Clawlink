/**
 * HTTP Client for Agentrix API
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { AgentrixConfig, AgentrixResponse } from './types/common';
import { handleError, AgentrixSDKError } from './utils/errors';

export class AgentrixClient {
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private retries: number;
  private client: AxiosInstance;

  constructor(config: AgentrixConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseUrl || 'https://api.agentrix.com/api';
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(handleError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response.data;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Retry logic for network errors
        if (
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          (error.response?.status && error.response.status >= 500)
        ) {
          if (!originalRequest._retry && this.retries > 0) {
            originalRequest._retry = true;
            this.retries--;

            // Exponential backoff
            const delay = Math.pow(2, 3 - this.retries) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));

            return this.client(originalRequest);
          }
        }

        return Promise.reject(handleError(error));
      }
    );
  }

  async get<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      return await this.client.get(path, config);
    } catch (error) {
      throw handleError(error);
    }
  }

  async post<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      return await this.client.post(path, data, config);
    } catch (error) {
      throw handleError(error);
    }
  }

  async put<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      return await this.client.put(path, data, config);
    } catch (error) {
      throw handleError(error);
    }
  }

  async delete<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      return await this.client.delete(path, config);
    } catch (error) {
      throw handleError(error);
    }
  }

  async patch<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      return await this.client.patch(path, data, config);
    } catch (error) {
      throw handleError(error);
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }

  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }
}

