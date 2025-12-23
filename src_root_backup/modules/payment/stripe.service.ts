import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/payment.dto';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not configured. Stripe features will be disabled.');
      this.logger.warn('To enable Stripe, add STRIPE_SECRET_KEY to your .env file');
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-08-16',
      });
    }
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file');
    }

    const amount = Math.round(dto.amount * 100); // 转换为分

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: dto.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      // 启用3D Secure
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
      metadata: {
        userId: dto.userId || '',
        description: dto.description || '',
        paymentId: dto.paymentId || '', // 用于Webhook回调时查找支付记录
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async confirmPayment(paymentIntentId: string) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file');
    }
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
}
