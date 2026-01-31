"use client";

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ========== User Types ==========
export interface User {
  id: string;
  email: string;
  username?: string;
  status: 'active' | 'banned' | 'pending';
  role: string;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  lastLoginAt?: string;
  walletAddress?: string;
}

// ========== Merchant Types ==========
export interface Merchant {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'suspended';
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  revenue: number;
  productCount: number;
  createdAt: string;
}

// ========== Risk Types ==========
export interface RiskAlert {
  id: string;
  type: 'fraud' | 'chargeback' | 'suspicious_login' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  merchantId?: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: string;
}

// ========== Product Types ==========
export interface Product {
  id: string;
  name: string;
  merchantId: string;
  merchantName: string;
  price: number;
  status: 'active' | 'pending' | 'rejected' | 'archived';
  category: string;
  salesCount: number;
  createdAt: string;
}

// ========== Finance Types ==========
export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'payout' | 'fee';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  userId?: string;
  merchantId?: string;
  description: string;
  createdAt: string;
}

// ========== Mock Data ==========
const mockUsers: User[] = [
  { id: 'u1', email: 'alice@example.com', username: 'alice', status: 'active', role: 'user', kycStatus: 'approved', createdAt: '2026-01-15T10:00:00Z', lastLoginAt: '2026-01-28T08:00:00Z' },
  { id: 'u2', email: 'bob@test.com', username: 'bob', status: 'active', role: 'merchant', kycStatus: 'approved', createdAt: '2026-01-10T10:00:00Z', walletAddress: '0x1234...5678' },
  { id: 'u3', email: 'charlie@demo.com', username: 'charlie', status: 'pending', role: 'user', kycStatus: 'pending', createdAt: '2026-01-27T10:00:00Z' },
  { id: 'u4', email: 'dave@fake.com', username: 'dave', status: 'banned', role: 'user', kycStatus: 'rejected', createdAt: '2026-01-05T10:00:00Z' },
  { id: 'u5', email: 'eve@company.com', username: 'eve', status: 'active', role: 'developer', kycStatus: 'approved', createdAt: '2026-01-20T10:00:00Z', lastLoginAt: '2026-01-28T09:30:00Z' },
];

const mockMerchants: Merchant[] = [
  { id: 'm1', name: 'AI Tools Inc', email: 'contact@aitools.com', status: 'active', kycStatus: 'approved', revenue: 15234.56, productCount: 12, createdAt: '2026-01-01T10:00:00Z' },
  { id: 'm2', name: 'DataBot LLC', email: 'sales@databot.io', status: 'active', kycStatus: 'approved', revenue: 8920.00, productCount: 5, createdAt: '2026-01-05T10:00:00Z' },
  { id: 'm3', name: 'New Startup', email: 'hello@newstartup.com', status: 'pending', kycStatus: 'pending', revenue: 0, productCount: 0, createdAt: '2026-01-27T10:00:00Z' },
  { id: 'm4', name: 'Suspicious Seller', email: 'noreply@sus.com', status: 'suspended', kycStatus: 'rejected', revenue: 500, productCount: 2, createdAt: '2026-01-10T10:00:00Z' },
];

const mockRiskAlerts: RiskAlert[] = [
  { id: 'r1', type: 'suspicious_login', severity: 'high', description: 'Multiple failed login attempts from IP 192.168.1.100', userId: 'u4', status: 'open', createdAt: '2026-01-28T07:30:00Z' },
  { id: 'r2', type: 'fraud', severity: 'critical', description: 'Card testing pattern detected - 50 micro-transactions in 5 minutes', merchantId: 'm4', status: 'investigating', createdAt: '2026-01-28T06:00:00Z' },
  { id: 'r3', type: 'chargeback', severity: 'medium', description: 'Chargeback filed for order #12345 ($99.00)', userId: 'u2', merchantId: 'm1', status: 'open', createdAt: '2026-01-27T15:00:00Z' },
  { id: 'r4', type: 'rate_limit', severity: 'low', description: 'API rate limit exceeded by developer app-xyz', status: 'resolved', createdAt: '2026-01-26T12:00:00Z' },
];

const mockProducts: Product[] = [
  { id: 'p1', name: 'ChatGPT Plugin Pro', merchantId: 'm1', merchantName: 'AI Tools Inc', price: 29.99, status: 'active', category: 'AI Plugins', salesCount: 156, createdAt: '2026-01-05T10:00:00Z' },
  { id: 'p2', name: 'Data Analyzer Bot', merchantId: 'm2', merchantName: 'DataBot LLC', price: 49.99, status: 'active', category: 'Analytics', salesCount: 89, createdAt: '2026-01-10T10:00:00Z' },
  { id: 'p3', name: 'Suspicious Product', merchantId: 'm4', merchantName: 'Suspicious Seller', price: 9.99, status: 'rejected', category: 'Unknown', salesCount: 0, createdAt: '2026-01-15T10:00:00Z' },
  { id: 'p4', name: 'New AI Tool', merchantId: 'm3', merchantName: 'New Startup', price: 19.99, status: 'pending', category: 'AI Tools', salesCount: 0, createdAt: '2026-01-27T10:00:00Z' },
];

const mockTransactions: Transaction[] = [
  { id: 't1', type: 'payment', amount: 29.99, currency: 'USD', status: 'completed', userId: 'u1', merchantId: 'm1', description: 'Purchase: ChatGPT Plugin Pro', createdAt: '2026-01-28T09:00:00Z' },
  { id: 't2', type: 'payment', amount: 49.99, currency: 'USD', status: 'completed', userId: 'u2', merchantId: 'm2', description: 'Purchase: Data Analyzer Bot', createdAt: '2026-01-28T08:30:00Z' },
  { id: 't3', type: 'refund', amount: -29.99, currency: 'USD', status: 'completed', userId: 'u1', merchantId: 'm1', description: 'Refund: ChatGPT Plugin Pro', createdAt: '2026-01-27T14:00:00Z' },
  { id: 't4', type: 'payout', amount: -1200.00, currency: 'USD', status: 'pending', merchantId: 'm1', description: 'Weekly payout to AI Tools Inc', createdAt: '2026-01-28T00:00:00Z' },
  { id: 't5', type: 'fee', amount: 2.99, currency: 'USD', status: 'completed', merchantId: 'm1', description: 'Platform fee (10%)', createdAt: '2026-01-28T09:00:00Z' },
];

// ========== Hooks ==========
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/hq/engine/users');
      console.log('Fetched users from API:', data);
      setUsers(data.items || data);
    } catch (e) {
      console.error('Failed to fetch users from API, using mock data:', e);
      setError(e as Error);
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}

export function useMerchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMerchants = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/hq/engine/merchants');
      setMerchants(data.items || data);
    } catch (e) {
      console.error('Failed to fetch merchants:', e);
      setError(e as Error);
      setMerchants(mockMerchants);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  return { merchants, loading, error, refetch: fetchMerchants };
}

export function useRiskAlerts() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/hq/engine/risk/alerts');
      setAlerts(data.items || data);
    } catch (e) {
      console.error('Failed to fetch risk alerts:', e);
      setError(e as Error);
      setAlerts(mockRiskAlerts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, error, refetch: fetchAlerts };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/hq/engine/products');
      setProducts(data.items || data);
    } catch (e) {
      console.error('Failed to fetch products:', e);
      setError(e as Error);
      setProducts(mockProducts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/hq/engine/finance/transactions');
      setTransactions(data.items || data);
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
      setError(e as Error);
      setTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, refetch: fetchTransactions };
}
