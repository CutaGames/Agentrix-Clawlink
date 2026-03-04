import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ISkill, SkillResult, SkillContext } from '../interfaces/skill.interface';
import { CartService } from '../../../cart/cart.service';
import { OrderService } from '../../../order/order.service';
import { ExchangeRateService } from '../../../payment/exchange-rate.service';
import { MemoryType } from '../../../../entities/agent-memory.entity';

@Injectable()
export class CheckoutSkill implements ISkill {
  id = 'checkout';
  name = '结算';
  description = '创建订单并结算购物车';
  supportedIntents = ['checkout', '结算', '下单', 'create_order', 'place_order'];

  constructor(
    @Inject(forwardRef(() => CartService))
    private cartService: CartService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
    @Inject(forwardRef(() => ExchangeRateService))
    private exchangeRateService: ExchangeRateService,
  ) {}

  async execute(params: Record<string, any>, context: SkillContext): Promise<SkillResult> {
    try {
      if (!context.userId) {
        return {
          success: false,
          message: '创建订单需要登录账号。请先登录后再进行结算。\n\n🔐 登录步骤：\n• 点击右上角用户菜单中的"登录"选项\n• 或访问：/login 进行登录\n• 如果没有账号，可以访问：/register 注册新账号\n\n💡 提示：您可以将商品加入购物车，登录后再结算。购物车中的商品会自动保存。',
        };
      }

      // 尝试从 sessionId 购物车迁移到 userId 购物车（如果存在）
      if (context.sessionId) {
        try {
          const sessionCart = await this.cartService.getCartWithProducts(context.sessionId, true);
          if (sessionCart.items && sessionCart.items.length > 0) {
            // 迁移商品到用户购物车
            for (const item of sessionCart.items) {
              await this.cartService.addToCart(context.userId, item.productId, item.quantity, false);
            }
            // 清空 session 购物车
            await this.cartService.clearCart(context.sessionId, true);
          }
        } catch (error) {
          // 迁移失败不影响继续执行
          console.warn('迁移 session 购物车失败:', error);
        }
      }

      // 获取购物车
      const cart = await this.cartService.getCartWithProducts(context.userId);

      if (!cart.items || cart.items.length === 0) {
        return {
          success: false,
          message: '购物车是空的，请先添加商品。',
        };
      }

      // 检查库存
      const outOfStockItems: any[] = [];
      for (const item of cart.items) {
        if (item.product && item.product.stock < item.quantity) {
          outOfStockItems.push({
            product: item.product.name,
            stock: item.product.stock,
            requested: item.quantity,
          });
        }
      }

      if (outOfStockItems.length > 0) {
        const message = outOfStockItems
          .map(
            (item) =>
              `• ${item.product}：库存 ${item.stock}，需要 ${item.requested}`,
          )
          .join('\n');
        return {
          success: false,
          message: `以下商品库存不足：\n${message}\n\n请调整数量后重试。`,
        };
      }

      // 获取第一个商品的商户ID（假设所有商品来自同一商户）
      const firstItem = cart.items[0];
      if (!firstItem.product) {
        return {
          success: false,
          message: '购物车中的商品信息不完整，无法结算。请重新添加商品。',
        };
      }

      const merchantId = firstItem.product.merchantId || 'default';
      const firstProductId = firstItem.productId;

      // 检测所有商品的货币，统一转换为 USDC
      const currencies = new Set<string>();
      const itemsWithCurrency: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
        currency: string;
        amountInOriginalCurrency: number;
      }> = [];

      for (const item of cart.items) {
        if (!item.product) continue;
        const itemCurrency = item.product.currency || 'CNY';
        currencies.add(itemCurrency);
        const itemPrice = typeof item.product.price === 'number' 
          ? item.product.price 
          : parseFloat(String(item.product.price || 0));
        const itemAmount = itemPrice * item.quantity;
        
        itemsWithCurrency.push({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: itemPrice,
          currency: itemCurrency,
          amountInOriginalCurrency: itemAmount,
        });
      }

      // 统一货币为 USDC，按照 1 USD = 1 USDT = 1 USDC 的规则
      let totalAmountInUSDC = 0;
      const currencyConversions: Record<string, number> = {};

      for (const item of itemsWithCurrency) {
        let amountInUSDC = 0;
        
        // 处理不同货币到 USDC 的转换
        if (item.currency === 'USDC' || item.currency === 'USDT' || item.currency === 'USD') {
          // 1 USD = 1 USDT = 1 USDC
          amountInUSDC = item.amountInOriginalCurrency;
        } else {
          // 其他货币需要汇率转换
          try {
            const rate = await this.exchangeRateService.getExchangeRate(item.currency, 'USDC');
            amountInUSDC = item.amountInOriginalCurrency * rate;
            currencyConversions[item.currency] = rate;
          } catch (error) {
            // 如果汇率获取失败，使用默认汇率（CNY -> USDC 约 0.142）
            const defaultRate = item.currency === 'CNY' ? 0.142 : 1.0;
            amountInUSDC = item.amountInOriginalCurrency * defaultRate;
            currencyConversions[item.currency] = defaultRate;
          }
        }
        
        totalAmountInUSDC += amountInUSDC;
      }

      // 创建订单（统一使用 USDC 作为结算货币）
      const order = await this.orderService.createOrder(context.userId, {
        merchantId,
        productId: firstProductId,
        amount: totalAmountInUSDC,
        currency: 'USDC',
        metadata: {
          items: itemsWithCurrency.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            currency: item.currency,
            amountInOriginalCurrency: item.amountInOriginalCurrency,
          })),
          orderType: 'cart_checkout',
          currencyConversions, // 保存汇率转换信息
          originalTotal: cart.total, // 保存原始总价（用于显示）
        },
      });

      // 清空购物车
      await this.cartService.clearCart(context.userId);

      // 保存订单到 Memory
      if (context.memory) {
        await context.memory.saveMemory(
          context.sessionId,
          MemoryType.ENTITY,
          'current_order',
          {
            orderId: order.id,
            status: order.status,
            total: order.amount,
            createdAt: order.createdAt,
          },
          {
            importance: 0.9,
            tags: ['order', 'checkout'],
          },
        );
      }

      // 确保金额是数字类型（TypeORM 的 decimal 可能返回字符串）
      const orderAmount = typeof order.amount === 'number' 
        ? order.amount 
        : typeof order.amount === 'string' 
          ? parseFloat(order.amount) 
          : 0;
      
      // 订单统一使用 USDC
      const orderCurrency = 'USDC';
      const amountDisplay = `${orderAmount.toFixed(2)} ${orderCurrency}`;
      
      // 构建订单详情消息，显示各商品的原始货币和转换后的 USDC
      let orderDetails = `✅ 订单创建成功！\n\n📦 订单信息：\n• 订单号：${order.id}\n• 商品数量：${cart.items.length}\n• 订单总额：${amountDisplay}`;
      
      // 如果有多种货币，显示转换详情
      if (Object.keys(currencyConversions).length > 0) {
        orderDetails += `\n\n💱 货币转换详情：`;
        for (const [originalCurrency, rate] of Object.entries(currencyConversions)) {
          const itemsInCurrency = itemsWithCurrency.filter(item => item.currency === originalCurrency);
          const totalInCurrency = itemsInCurrency.reduce((sum, item) => sum + item.amountInOriginalCurrency, 0);
          const totalInUSDC = totalInCurrency * rate;
          orderDetails += `\n• ${originalCurrency}: ${totalInCurrency.toFixed(2)} → ${totalInUSDC.toFixed(2)} USDC (汇率: ${rate.toFixed(6)})`;
        }
      }
      
      orderDetails += `\n• 订单状态：${order.status}\n\n💡 下一步操作：\n• 说"支付"或"付款"来完成支付\n• 说"查看订单"查看订单详情`;

      return {
        success: true,
        message: orderDetails,
        data: {
          order: {
            ...order,
            amount: orderAmount, // 确保返回数字类型
            currency: orderCurrency,
          },
          items: cart.items,
          currencyConversions, // 返回汇率转换信息
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: `创建订单时出现错误：${error.message}。请稍后重试。`,
      };
    }
  }
}

