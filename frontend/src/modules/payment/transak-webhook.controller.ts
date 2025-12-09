import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { TransakProviderService } from './transak-provider.service';
import { PaymentService } from './payment.service';
import { Payment, PaymentStatus, PaymentMethod } from '../../entities/payment.entity';

/**
 * Transak Webhook Controller
 * 接收 Transak 的异步通知回调
 * 
 * 文档: https://docs.transak.com/docs/webhooks
 */
@ApiTags('payments')
@Controller('payments/provider/transak')
export class TransakWebhookController {
  private readonly logger = new Logger(TransakWebhookController.name);

  constructor(
    private readonly transakProvider: TransakProviderService,
    private readonly paymentService: PaymentService,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transak 异步通知回调' })
  @ApiBody({ description: 'Transak 回调数据' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    this.logger.log('Received Transak webhook:', JSON.stringify(body));

    try {
      // 1. 验证签名
      // Transak 使用 HMAC SHA256 签名，签名在 X-Transak-Signature header 中
      const signature = headers['x-transak-signature'] || headers['X-Transak-Signature'];
      if (signature && req.rawBody) {
        const rawBody = typeof req.rawBody === 'string' 
          ? req.rawBody 
          : Buffer.from(req.rawBody).toString('utf-8');
        
        if (!this.transakProvider.verifySignature(rawBody, signature)) {
          this.logger.error('Transak webhook: Invalid signature');
          return { success: false, message: 'Invalid signature' };
        }
      } else {
        this.logger.warn('Transak webhook: Missing signature or raw body, skipping verification');
      }

      // 2. 提取订单信息
      // Transak webhook 事件类型: ORDER_PROCESSING, ORDER_COMPLETED, ORDER_FAILED
      const eventType = body.eventId || body.event_id || body.type;
      const orderId = body.data?.orderId || body.data?.order_id || body.orderId || body.order_id;
      const status = body.data?.status || body.status;
      const fiatAmount = parseFloat(body.data?.fiatAmount || body.data?.fiat_amount || body.fiatAmount || '0');
      const fiatCurrency = body.data?.fiatCurrency || body.data?.fiat_currency || body.fiatCurrency;
      const cryptoAmount = parseFloat(body.data?.cryptoAmount || body.data?.crypto_amount || body.cryptoAmount || '0');
      const cryptoCurrency = body.data?.cryptoCurrency || body.data?.crypto_currency || body.cryptoCurrency;
      const transactionHash = body.data?.transactionHash || body.data?.transaction_hash || body.transactionHash;
      const walletAddress = body.data?.walletAddress || body.data?.wallet_address || body.walletAddress;
      const partnerOrderId = body.data?.partnerOrderId || body.data?.partner_order_id || body.partnerOrderId;

      this.logger.log(
        `Transak webhook: Event ${eventType}, Order ${orderId}, Status: ${status}`,
      );

      // 3. 根据 partnerOrderId 或 orderId 查找支付记录
      let payment: Payment | null = null;

      if (partnerOrderId) {
        // 优先使用 partnerOrderId（我们传入的订单ID）
        const allPayments = await this.paymentRepository.find({
          where: {
            paymentMethod: PaymentMethod.TRANSAK,
            status: PaymentStatus.PROCESSING,
          },
          order: { createdAt: 'DESC' },
          take: 100,
        });

        payment = allPayments.find((p) => {
          const metadata = p.metadata || {};
          return (
            metadata.providerOrderId === partnerOrderId ||
            metadata.transakOrderId === partnerOrderId ||
            metadata.transactionId === partnerOrderId ||
            (metadata as any)?.transak?.orderId === partnerOrderId
          );
        }) || null;
      }

      if (!payment && orderId) {
        // 如果找不到，尝试用 Transak 的 orderId
        const allPayments = await this.paymentRepository.find({
          where: {
            paymentMethod: PaymentMethod.TRANSAK,
          },
          order: { createdAt: 'DESC' },
          take: 100,
        });

        payment = allPayments.find((p) => {
          const metadata = p.metadata || {};
          return (
            metadata.transakOrderId === orderId ||
            (metadata as any)?.transak?.transakOrderId === orderId
          );
        }) || null;
      }

      if (!payment) {
        this.logger.warn(
          `Transak webhook: Payment not found for order ${orderId || partnerOrderId}`,
        );
        // 即使找不到支付记录，也返回成功，避免 Transak 重复回调
        return {
          success: true,
          message: 'Webhook received but payment not found',
        };
      }

      this.logger.log(
        `Transak webhook: Found payment ${payment.id} for order ${orderId || partnerOrderId}`,
      );

      // 4. 根据事件类型更新支付状态
      if (
        eventType === 'ORDER_COMPLETED' ||
        status === 'COMPLETED' ||
        status === 'completed'
      ) {
        // 支付成功
        if (payment.status !== PaymentStatus.COMPLETED) {
          payment.status = PaymentStatus.COMPLETED;
          if (transactionHash) {
            payment.transactionHash = transactionHash;
          }
          payment.metadata = {
            ...payment.metadata,
            transakOrderId: orderId,
            transakStatus: status,
            transakEventType: eventType,
            transakCryptoAmount: cryptoAmount,
            transakCryptoCurrency: cryptoCurrency,
            transakFiatAmount: fiatAmount,
            transakFiatCurrency: fiatCurrency,
            transakWalletAddress: walletAddress,
            transakWebhookReceivedAt: new Date().toISOString(),
          };
          await this.paymentRepository.save(payment);

          this.logger.log(`Transak webhook: Payment ${payment.id} marked as completed`);
        } else {
          this.logger.log(
            `Transak webhook: Payment ${payment.id} already completed, skipping update`,
          );
        }

        return {
          success: true,
          message: 'Webhook processed successfully',
        };
      } else if (
        eventType === 'ORDER_FAILED' ||
        status === 'FAILED' ||
        status === 'failed' ||
        status === 'CANCELLED' ||
        status === 'cancelled'
      ) {
        // 支付失败或取消
        if (payment.status !== PaymentStatus.FAILED) {
          payment.status = PaymentStatus.FAILED;
          payment.metadata = {
            ...payment.metadata,
            transakOrderId: orderId,
            transakStatus: status,
            transakEventType: eventType,
            transakWebhookReceivedAt: new Date().toISOString(),
          };
          await this.paymentRepository.save(payment);
          this.logger.log(`Transak webhook: Payment ${payment.id} marked as failed`);
        }

        return {
          success: true,
          message: 'Webhook processed successfully',
        };
      } else {
        // 其他状态（如处理中）
        this.logger.log(
          `Transak webhook: Order ${orderId} status: ${status} (${eventType})`,
        );

        // 更新 metadata 但不改变状态
        payment.metadata = {
          ...payment.metadata,
          transakOrderId: orderId,
          transakStatus: status,
          transakEventType: eventType,
          transakCryptoAmount: cryptoAmount,
          transakCryptoCurrency: cryptoCurrency,
          transakFiatAmount: fiatAmount,
          transakFiatCurrency: fiatCurrency,
          transakWebhookReceivedAt: new Date().toISOString(),
        };
        await this.paymentRepository.save(payment);

        return {
          success: true,
          message: 'Webhook processed successfully',
        };
      }
    } catch (error: any) {
      this.logger.error(`Transak webhook error: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Internal server error',
      };
    }
  }
}

