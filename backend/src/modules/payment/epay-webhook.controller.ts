import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EPAYProviderService } from './epay-provider.service';
import { PaymentService } from './payment.service';
import { CommissionService } from '../commission/commission.service';
import { Payment, PaymentStatus, PaymentMethod } from '../../entities/payment.entity';

/**
 * EPAY Webhook Controller
 * 接收EPAY的异步通知回调
 */
@ApiTags('payments')
@Controller('payments/provider/epay')
export class EPAYWebhookController {
  private readonly logger = new Logger(EPAYWebhookController.name);

  constructor(
    private readonly epayProvider: EPAYProviderService,
    private readonly paymentService: PaymentService,
    private readonly commissionService: CommissionService,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'EPAY异步通知回调' })
  @ApiBody({ description: 'EPAY回调数据' })
  async handleWebhook(
    @Body() body: any,
    @Headers() headers: any,
  ) {
    this.logger.log('Received EPAY webhook:', JSON.stringify(body));

    try {
      // 1. 验证签名
      const signature = body.sign || headers['x-epay-signature'];
      if (!signature) {
        this.logger.error('EPAY webhook: Missing signature');
        return { code: 'FAIL', message: 'Missing signature' };
      }

      // 提取签名参数（排除sign字段）
      const { sign, ...paramsToVerify } = body;
      
      if (!this.epayProvider.verifySignature(paramsToVerify, signature)) {
        this.logger.error('EPAY webhook: Invalid signature');
        return { code: 'FAIL', message: 'Invalid signature' };
      }

      // 2. 提取订单信息
      const epayOrderId = body.order_id || body.orderId;
      const status = body.status || body.order_status; // EPAY订单状态
      const amount = parseFloat(body.amount || '0');
      const currency = body.currency || body.currency_code;
      const transactionHash = body.transaction_hash || body.tx_hash || body.hash;
      const cryptoAmount = parseFloat(body.crypto_amount || body.to_amount || '0');
      const cryptoCurrency = body.to_currency || body.crypto_currency;

      this.logger.log(`EPAY webhook: Order ${epayOrderId}, Status: ${status}, Amount: ${amount} ${currency}`);

      // 3. 根据EPAY订单ID查找PayMind支付记录
      // EPAY订单ID可能存储在Payment的metadata中（如 metadata.providerOrderId 或 metadata.epayOrderId）
      // 由于TypeORM的JSON查询限制，我们需要查询所有相关支付记录，然后在代码中过滤
      const allPayments = await this.paymentRepository.find({
        where: {
          paymentMethod: PaymentMethod.EPAY, // 只查询EPAY支付方式的记录
          status: PaymentStatus.PROCESSING, // 只查询处理中的支付
        },
        order: { createdAt: 'DESC' },
        take: 100, // 限制查询数量
      });

      // 在代码中查找匹配的支付记录
      let payment = allPayments.find((p) => {
        const metadata = p.metadata || {};
        return (
          metadata.providerOrderId === epayOrderId ||
          metadata.epayOrderId === epayOrderId ||
          metadata.transactionId === epayOrderId ||
          (metadata as any)?.epay?.orderId === epayOrderId
        );
      });

      if (!payment) {
        this.logger.warn(`EPAY webhook: Payment not found for EPAY order ${epayOrderId}`);
        // 即使找不到支付记录，也返回成功，避免EPAY重复回调
        return {
          code: 'SUCCESS',
          message: 'Webhook received but payment not found',
        };
      }

      this.logger.log(`EPAY webhook: Found payment ${payment.id} for EPAY order ${epayOrderId}`);

      // 4. 根据订单状态更新PayMind订单
      if (status === 'SUCCESS' || status === 'PAID' || status === 'success' || status === 'paid') {
        // 支付成功，更新支付状态并触发Commission合约分账
        if (payment.status !== PaymentStatus.COMPLETED) {
          // 更新支付状态
          payment.status = PaymentStatus.COMPLETED;
          payment.transactionHash = transactionHash;
          payment.metadata = {
            ...payment.metadata,
            epayOrderId: epayOrderId,
            epayStatus: status,
            epayCryptoAmount: cryptoAmount,
            epayCryptoCurrency: cryptoCurrency,
            epayWebhookReceivedAt: new Date().toISOString(),
          };
          await this.paymentRepository.save(payment);

          this.logger.log(`EPAY webhook: Payment ${payment.id} marked as completed`);

          // 调用Commission合约进行分账
          // 注意：需要根据实际的Commission合约接口调用
          // 这里假设Commission合约有providerFiatToCryptoSplit方法
          try {
            // TODO: 调用Commission合约的providerFiatToCryptoSplit函数
            // 需要传入：orderId, amount, currency等信息
            this.logger.log(`EPAY webhook: Triggering commission split for payment ${payment.id}`);
            // await this.commissionService.handleProviderPayment(payment.id, {
            //   providerId: 'epay',
            //   providerOrderId: epayOrderId,
            //   amount: cryptoAmount || amount,
            //   currency: cryptoCurrency || currency,
            //   transactionHash,
            // });
          } catch (commissionError: any) {
            this.logger.error(`EPAY webhook: Commission split failed: ${commissionError.message}`);
            // 即使分账失败，也返回成功给EPAY，避免重复回调
            // 分账失败可以通过其他方式处理（如定时任务重试）
          }
        } else {
          this.logger.log(`EPAY webhook: Payment ${payment.id} already completed, skipping update`);
        }
        
        // 返回成功响应给EPAY
        return {
          code: 'SUCCESS',
          message: 'Webhook processed successfully',
        };
      } else if (status === 'FAILED' || status === 'CANCELLED' || status === 'failed' || status === 'cancelled') {
        // 支付失败或取消
        if (payment.status !== PaymentStatus.FAILED) {
          payment.status = PaymentStatus.FAILED;
          payment.metadata = {
            ...payment.metadata,
            epayOrderId: epayOrderId,
            epayStatus: status,
            epayWebhookReceivedAt: new Date().toISOString(),
          };
          await this.paymentRepository.save(payment);
          this.logger.log(`EPAY webhook: Payment ${payment.id} marked as failed`);
        }
        
        return {
          code: 'SUCCESS',
          message: 'Webhook processed successfully',
        };
      } else {
        // 其他状态（如处理中）
        this.logger.log(`EPAY webhook: Order ${epayOrderId} status: ${status} (pending)`);
        
        // 更新metadata但不改变状态
        payment.metadata = {
          ...payment.metadata,
          epayOrderId: epayOrderId,
          epayStatus: status,
          epayWebhookReceivedAt: new Date().toISOString(),
        };
        await this.paymentRepository.save(payment);
        
        return {
          code: 'SUCCESS',
          message: 'Webhook processed successfully',
        };
      }
    } catch (error: any) {
      this.logger.error(`EPAY webhook error: ${error.message}`, error.stack);
      return {
        code: 'FAIL',
        message: error.message || 'Internal server error',
      };
    }
  }
}

