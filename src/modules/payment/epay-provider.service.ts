import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { URLSearchParams } from 'url';
import { IProvider, ProviderQuote, OnRampParams, OnRampResult, OffRampParams, OffRampResult } from './provider-abstract.service';
import * as crypto from 'crypto';
import * as https from 'https';
import axios from 'axios';

/**
 * EPAY Provider Service
 * 实现EPAY支付网关的On-ramp和Off-ramp功能
 * 
 * 文档: https://opendocs.epay.com/docu/cn/
 * 最新文档包含Java和PHP的加签demo
 */
@Injectable()
export class EPAYProviderService implements IProvider {
  private readonly logger = new Logger(EPAYProviderService.name);
  
  id = 'epay';
  name = 'EPAY Gateway';
  supportsOnRamp = true;
  supportsOffRamp = true;

  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string; // 测试环境或生产环境URL
  private readonly webhookUrl: string; // Agentrix接收EPAY回调的URL

  constructor(private configService: ConfigService) {
    // 从环境变量读取EPAY配置
    this.merchantId = this.configService.get<string>('EPAY_MERCHANT_ID') || '';
    this.apiKey = this.configService.get<string>('EPAY_API_KEY') || '';
    this.secretKey = this.configService.get<string>('EPAY_SECRET_KEY') || '';
    
    // 根据环境选择URL（测试环境或生产环境）
    const isTest = this.configService.get<string>('NODE_ENV') !== 'production';
    this.baseUrl = isTest 
      ? this.configService.get<string>('EPAY_TEST_URL') || 'https://test-api.epay.com'
      : this.configService.get<string>('EPAY_PRODUCTION_URL') || 'https://api.epay.com';
    
    this.webhookUrl = this.configService.get<string>('EPAY_WEBHOOK_URL') || 
      `${this.configService.get<string>('API_BASE_URL') || 'http://localhost:3001'}/api/payments/provider/epay/webhook`;

    if (!this.merchantId || !this.apiKey || !this.secretKey) {
      this.logger.warn('EPAY credentials not configured. EPAY Provider will not work.');
    }
  }

  /**
   * 将参数对象转换为 application/x-www-form-urlencoded 编码
   */
  private buildFormData(params: Record<string, any>): string {
    const formData = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      formData.append(key, String(value));
    });
    return formData.toString();
  }

  /**
   * 生成EPAY接口签名
   * 参考EPAY文档的"接口签名"章节：https://opendocs.epay.com/docu/cn/before/api_sign.html
   * 
   * 签名步骤：
   * 1. 去掉空值和null值
   * 2. 按参数名ASCII码从小到大排序，转换成JSON格式字符串
   * 3. 将JSON格式字符串转换成queryString格式（key1=value1&key2=value2）
   * 4. 拼接key={API_KEY}
   * 5. SHA256运算并转大写
   */
  private generateSignature(params: Record<string, any>): string {
    // 1. 去掉空值和null值
    const filteredParams: Record<string, any> = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        filteredParams[key] = value;
      }
    });
    
    // 2. 按参数名ASCII码从小到大排序，转换成JSON格式字符串
    const sortedKeys = Object.keys(filteredParams).sort();
    const jsonString = JSON.stringify(
      sortedKeys.reduce((obj, key) => {
        obj[key] = filteredParams[key];
        return obj;
      }, {} as Record<string, any>)
    );
    
    // 3. 将JSON格式字符串转换成queryString格式
    // 注意：如果值是对象，需要特殊处理，但通常EPAY的参数都是简单类型
    const queryString = sortedKeys
      .map(key => {
        const value = filteredParams[key];
        // 如果值是对象，需要转换为JSON字符串
        if (typeof value === 'object') {
          return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}=${value}`;
      })
      .join('&');
    
    // 4. 拼接key={API_KEY}
    // 注意：文档中使用的是API_KEY，不是secretKey，需要确认
    const signString = `${queryString}&key=${this.apiKey}`;
    
    // 5. SHA256运算并转大写
    const sign = crypto.createHash('sha256').update(signString).digest('hex').toUpperCase();
    
    return sign;
  }

  /**
   * 验证EPAY回调签名
   */
  verifySignature(params: Record<string, any>, signature: string): boolean {
    const calculatedSign = this.generateSignature(params);
    return calculatedSign === signature;
  }

  /**
   * 获取报价（调用EPAY"计算汇率"接口）
   * API: Before.计算汇率
   */
  async getQuote(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ProviderQuote> {
    this.logger.log(
      `EPAY: Get quote for ${amount} ${fromCurrency} -> ${toCurrency}`,
    );

    try {
      // 构建请求参数
      const params = {
        merchant_id: this.merchantId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount: amount.toString(),
        timestamp: Date.now().toString(),
      };

      // 生成签名（不包括sign字段）
      const sign = this.generateSignature(params);

      // 调用EPAY API（计算汇率）
      // 根据最新文档 https://opendocs.epay.com/docu/cn/
      // 根据搜索结果，API路径可能是 /capi/openapi/xxx 格式
      // 请求格式：application/json，请求体格式：{ "sign": "...", "param": {...} }
      let apiEndpoint: string;
      const baseUrlWithoutEpayweb = this.baseUrl.replace(/\/epayweb$/, '');
      
      // 尝试格式: /capi/openapi/calculateRate
      apiEndpoint = `${baseUrlWithoutEpayweb}/capi/openapi/calculateRate`;
      
      this.logger.log(`EPAY GetQuote API Endpoint: ${apiEndpoint}`);
      
      // JSON格式请求
      const requestBody = {
        sign: sign,
        param: params,
      };
      
      const response = await axios.post(
        apiEndpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30秒超时
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // 测试环境可能需要
          }),
        },
      );

      // EPAY响应格式可能是 { code: '0000', message: 'success', data: {...} } 或直接返回数据
      const responseData = response.data;
      
      // 检查响应格式
      if (responseData.code && responseData.code !== '0000' && responseData.code !== '200') {
        throw new Error(`EPAY API error: ${responseData.message || responseData.msg || 'Unknown error'}`);
      }

      // 提取数据（可能在data字段中，也可能直接在根级别）
      const data = responseData.data || responseData;
      
      return {
        providerId: this.id,
        rate: parseFloat(data.rate || data.exchange_rate || '1.0') || 1.0,
        fee: parseFloat(data.fee || data.service_fee || '0') || 0,
        estimatedAmount: parseFloat(data.estimated_amount || data.to_amount || amount.toString()) || amount,
        expiresAt: new Date(Date.now() + (parseInt(data.expires_in || '60') || 60) * 1000),
      };
    } catch (error: any) {
      this.logger.error(`EPAY getQuote error: ${error.message}`, error.stack);
      throw new Error(`Failed to get quote from EPAY: ${error.message}`);
    }
  }

  /**
   * 执行On-ramp（法币转数字货币）
   * API: Payment.收银台代收 或 Payment.快捷代收
   */
  async executeOnRamp(params: OnRampParams): Promise<OnRampResult> {
    this.logger.log(
      `EPAY: Execute On-ramp for ${params.amount} ${params.fromCurrency} -> ${params.toCurrency}`,
    );

    try {
      // 构建请求参数
      const orderId = params.orderId || `epay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      const requestParams = {
        merchant_id: this.merchantId,
        order_id: orderId,
        amount: params.amount.toString(),
        currency: params.fromCurrency,
        to_currency: params.toCurrency,
        notify_url: this.webhookUrl,
        return_url: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/pay/success?orderId=${orderId}`,
        timestamp: Date.now().toString(),
        metadata: JSON.stringify(params.metadata || {}),
      };

      // 调用EPAY API（收银台代收）
      // 根据最新文档 https://opendocs.epay.com/docu/cn/
      // 根据搜索结果，API路径可能是 /capi/openapi/xxx 格式
      // 请求格式可能是 application/json
      let apiEndpoint: string;
      const baseUrlWithoutEpayweb = this.baseUrl.replace(/\/epayweb$/, '');
      
      // 尝试格式: /capi/openapi/payment（收银台代收）
      apiEndpoint = `${baseUrlWithoutEpayweb}/capi/openapi/payment`;
      
      this.logger.log(`EPAY OnRamp API Endpoint: ${apiEndpoint}`);
      
      // 生成签名（不包括sign字段）
      const sign = this.generateSignature(requestParams);
      
      // 尝试JSON格式请求
      const requestBody = {
        sign: sign,
        param: requestParams,
      };
      
      const response = await axios.post(
        apiEndpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30秒超时
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // 测试环境可能需要
          }),
        },
      );

      // EPAY响应格式可能是 { code: '0000', message: 'success', data: {...} } 或直接返回数据
      const responseData = response.data;
      
      // 检查响应格式
      if (responseData.code && responseData.code !== '0000' && responseData.code !== '200') {
        throw new Error(`EPAY API error: ${responseData.message || responseData.msg || 'Unknown error'}`);
      }

      // 提取数据（可能在data字段中，也可能直接在根级别）
      const data = responseData.data || responseData;

      // 返回结果
      // 注意：EPAY返回的是收银台URL，实际支付完成后通过Webhook通知
      return {
        transactionId: orderId,
        status: 'pending', // 等待用户完成支付
        cryptoAmount: parseFloat(data.estimated_crypto_amount || data.to_amount || params.amount.toString()) || params.amount,
        cryptoCurrency: params.toCurrency,
        // 返回收银台URL，前端需要跳转
        checkoutUrl: data.checkout_url || data.pay_url || data.url,
      } as OnRampResult & { checkoutUrl?: string };
    } catch (error: any) {
      this.logger.error(`EPAY executeOnRamp error: ${error.message}`, error.stack);
      throw new Error(`Failed to execute On-ramp with EPAY: ${error.message}`);
    }
  }

  /**
   * 执行Off-ramp（数字货币转法币）
   * API: Payment.BANK-创建订单 或 Payment.EWALLET-创建订单
   */
  async executeOffRamp(params: OffRampParams): Promise<OffRampResult> {
    this.logger.log(
      `EPAY: Execute Off-ramp for ${params.amount} ${params.fromCurrency} -> ${params.toCurrency}`,
    );

    try {
      const orderId = `epay_off_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // 构建请求参数
      const requestParams = {
        merchant_id: this.merchantId,
        order_id: orderId,
        amount: params.amount.toString(),
        from_currency: params.fromCurrency,
        to_currency: params.toCurrency,
        bank_account: params.bankAccount,
        notify_url: this.webhookUrl,
        timestamp: Date.now().toString(),
        metadata: JSON.stringify(params.metadata || {}),
      };

      // 生成签名（不包括sign字段）
      const sign = this.generateSignature(requestParams);

      // 调用EPAY API（银行代付）
      // 根据最新文档 https://opendocs.epay.com/docu/cn/
      // 根据搜索结果，代付接口路径：/capi/openapi/payoutApi/createTransaction
      let apiEndpoint: string;
      const baseUrlWithoutEpayweb = this.baseUrl.replace(/\/epayweb$/, '');
      apiEndpoint = `${baseUrlWithoutEpayweb}/capi/openapi/payoutApi/createTransaction`;
      
      this.logger.log(`EPAY OffRamp API Endpoint: ${apiEndpoint}`);
      
      // JSON格式请求
      const requestBody = {
        sign: sign,
        param: requestParams,
      };
      
      const response = await axios.post(
        apiEndpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30秒超时
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // 测试环境可能需要
          }),
        },
      );

      // EPAY响应格式可能是 { code: '0000', message: 'success', data: {...} } 或直接返回数据
      const responseData = response.data;
      
      // 检查响应格式
      if (responseData.code && responseData.code !== '0000' && responseData.code !== '200') {
        throw new Error(`EPAY API error: ${responseData.message || responseData.msg || 'Unknown error'}`);
      }

      // 提取数据（可能在data字段中，也可能直接在根级别）
      const data = responseData.data || responseData;

      return {
        transactionId: orderId,
        status: (data.status === 'success' || data.status === 'SUCCESS' || data.status === 'paid') ? 'completed' : 'pending',
        fiatAmount: parseFloat(data.fiat_amount || data.amount || params.amount.toString()) || params.amount,
        fiatCurrency: params.toCurrency,
        transactionHash: data.transaction_hash || data.tx_hash || data.hash,
      };
    } catch (error: any) {
      this.logger.error(`EPAY executeOffRamp error: ${error.message}`, error.stack);
      throw new Error(`Failed to execute Off-ramp with EPAY: ${error.message}`);
    }
  }

  /**
   * 查询订单状态
   * API: After.查询订单
   */
  async queryOrder(orderId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    transactionHash?: string;
  }> {
    try {
      const params = {
        merchant_id: this.merchantId,
        order_id: orderId,
        timestamp: Date.now().toString(),
      };

      // 生成签名（不包括sign字段）
      const sign = this.generateSignature(params);

      // 调用EPAY API（查询订单）
      // 根据最新文档 https://opendocs.epay.com/docu/cn/
      // 根据搜索结果，API路径可能是 /capi/openapi/xxx 格式
      let apiEndpoint: string;
      const baseUrlWithoutEpayweb = this.baseUrl.replace(/\/epayweb$/, '');
      apiEndpoint = `${baseUrlWithoutEpayweb}/capi/openapi/order/query`;
      
      this.logger.log(`EPAY QueryOrder API Endpoint: ${apiEndpoint}`);
      
      // JSON格式请求
      const requestBody = {
        sign: sign,
        param: params,
      };
      
      const response = await axios.post(
        apiEndpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30秒超时
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // 测试环境可能需要
          }),
        },
      );

      // EPAY响应格式可能是 { code: '0000', message: 'success', data: {...} } 或直接返回数据
      const responseData = response.data;
      
      // 检查响应格式
      if (responseData.code && responseData.code !== '0000' && responseData.code !== '200') {
        throw new Error(`EPAY API error: ${responseData.message || responseData.msg || 'Unknown error'}`);
      }

      // 提取数据（可能在data字段中，也可能直接在根级别）
      const data = responseData.data || responseData;

      return {
        status: data.status || data.order_status || 'unknown',
        amount: parseFloat(data.amount || '0') || 0,
        currency: data.currency || data.currency_code || '',
        transactionHash: data.transaction_hash || data.tx_hash || data.hash,
      };
    } catch (error: any) {
      this.logger.error(`EPAY queryOrder error: ${error.message}`, error.stack);
      throw new Error(`Failed to query order from EPAY: ${error.message}`);
    }
  }
}

