/**
 * Webhook handler for Agentrix SDK
 */

import crypto from 'crypto';

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

export class WebhookHandler {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string | Buffer, signature: string): boolean {
    if (!this.secret) {
      throw new Error('Webhook secret is required');
    }

    const hmac = crypto.createHmac('sha256', this.secret);
    const expectedSignature = hmac.update(payload).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Construct webhook event from payload
   */
  constructEvent(
    payload: string | Buffer,
    signature: string
  ): WebhookEvent {
    if (!this.verifySignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());
    
    return {
      id: data.id,
      type: data.type,
      data: data.data,
      timestamp: data.timestamp,
    };
  }

  /**
   * Parse webhook event (for Express.js)
   */
  parseEvent(req: any): WebhookEvent {
    const signature = req.headers['agentrix-signature'] || req.headers['x-agentrix-signature'];
    
    if (!signature) {
      throw new Error('Missing webhook signature');
    }

    const payload = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);

    return this.constructEvent(payload, signature);
  }
}

