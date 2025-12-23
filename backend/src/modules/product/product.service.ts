import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Product, ProductStatus } from '../../entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { SearchService } from '../search/search.service';
import { CapabilityRegistryService } from '../ai-capability/services/capability-registry.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @Inject(forwardRef(() => SearchService))
    private searchService: SearchService,
    @Inject(forwardRef(() => CapabilityRegistryService))
    private capabilityRegistry: CapabilityRegistryService,
    private configService: ConfigService,
  ) {}

  async getProducts(search?: string, merchantId?: string, status?: string, type?: string) {
    const where: any = {};
    
    // 如果指定了merchantId，只查询该商户的商品
    if (merchantId) {
      where.merchantId = merchantId;
    }
    
    // 状态过滤（默认只显示active，但商户后台需要看到所有状态）
    if (status) {
      where.status = status;
    } else if (!merchantId) {
      // 公开查询默认只显示active商品
      where.status = 'active';
    }
    
    if (search) {
      where.name = Like(`%${search}%`);
    }

    // 类型过滤
    if (type) {
      if (type === 'x402') {
        // X402 专区：使用 QueryBuilder 进行 JSONB 查询
        const qb = this.productRepository.createQueryBuilder('product');
        
        // 添加基础条件
        if (where.merchantId) {
          qb.andWhere('product.merchantId = :merchantId', { merchantId: where.merchantId });
        }
        if (where.status) {
          qb.andWhere('product.status = :status', { status: where.status });
        }
        if (where.name) {
          qb.andWhere('product.name LIKE :name', { name: `%${search}%` });
        }
        
        // X402 JSONB 条件
        qb.andWhere(`(product.metadata->>'x402Enabled' = 'true' OR product.metadata->'x402Params' IS NOT NULL)`);
        qb.orderBy('product.createdAt', 'DESC');
        
        return qb.getMany();
      } else {
        where.productType = type;
      }
    }
    
    return this.productRepository.find({ 
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async getProduct(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    return product;
  }

  async createProduct(merchantId: string, dto: CreateProductDto) {
    // 处理统一数据标准格式，转换为数据库存储格式
    const productData: any = {
      merchantId,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      productType: dto.productType || 'physical',
    };

    // 处理价格信息（统一标准格式优先）
    if (dto.price && typeof dto.price === 'object' && 'amount' in dto.price) {
      productData.price = dto.price.amount;
      // 将货币信息存储到 metadata
      if (!productData.metadata) productData.metadata = {};
      productData.metadata.currency = dto.price.currency || 'CNY';
    } else if (dto.price_legacy !== undefined) {
      // 向后兼容旧格式
      productData.price = dto.price_legacy;
      if (!productData.metadata) productData.metadata = {};
      productData.metadata.currency = 'CNY';
    } else if (typeof dto.price === 'number') {
      // 直接数字格式
      productData.price = dto.price;
      if (!productData.metadata) productData.metadata = {};
      productData.metadata.currency = 'CNY';
    }

    // 处理库存信息（统一标准格式优先）
    if (dto.inventory && typeof dto.inventory === 'object') {
      if (dto.inventory.type === 'finite' && dto.inventory.quantity !== undefined) {
        productData.stock = dto.inventory.quantity;
      } else if (dto.inventory.type === 'unlimited' || dto.inventory.type === 'digital') {
        productData.stock = 999999; // 无限库存用大数字表示
      }
    } else if (dto.stock !== undefined) {
      // 向后兼容旧格式
      productData.stock = dto.stock;
    } else {
      productData.stock = 0;
    }

    // 处理分润率
    if (dto.commissionRate !== undefined) {
      productData.commissionRate = dto.commissionRate;
    }

    // 处理统一元数据
    if (dto.metadata) {
      productData.metadata = {
        ...productData.metadata,
        ...dto.metadata,
        // 确保 core.media 结构正确
        core: dto.metadata.core || {
          media: {
            images: [],
          },
        },
      };
    }

    // 处理标签和其他扩展字段
    if (dto.tags && dto.tags.length > 0) {
      if (!productData.metadata) productData.metadata = {};
      productData.metadata.tags = dto.tags;
    }

    const product = this.productRepository.create(productData);
    const savedProduct = (await this.productRepository.save(product)) as unknown as Product;

    // 自动索引到向量数据库
    try {
      const currency = (savedProduct.metadata as any)?.extensions?.currency || 
                      (savedProduct.metadata as any)?.currency || 
                      (savedProduct.metadata as any)?.core?.price?.currency || 
                      'CNY';
      await this.searchService.indexProduct(
        savedProduct.id,
        savedProduct.name,
        savedProduct.description || '',
        {
          merchantId: savedProduct.merchantId,
          price: savedProduct.price,
          currency,
          category: savedProduct.category,
          stock: savedProduct.stock,
        },
      );
    } catch (error) {
      // 索引失败不影响商品创建
      console.error('商品索引失败:', error);
    }

    // 自动注册 AI 能力（生成 Function Schema）
    // 不指定平台，自动注册所有已注册的平台
    try {
      await this.capabilityRegistry.register(savedProduct.id, undefined, {
        autoEnable: true,
      });
    } catch (error) {
      // 能力注册失败不影响商品创建
      console.error('AI能力注册失败:', error);
    }

    return savedProduct;
  }

  async updateProduct(merchantId: string, id: string, dto: UpdateProductDto) {
    const product = await this.productRepository.findOne({
      where: { id, merchantId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    // 更新基本字段
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.commissionRate !== undefined) product.commissionRate = dto.commissionRate;
    if (dto.productType !== undefined) product.productType = dto.productType;
    
    // 合并metadata而不是完全替换
    if (dto.metadata) {
      const existingMetadata = (product.metadata as any) || {};
      product.metadata = {
        ...existingMetadata,
        ...dto.metadata,
        // 确保currency等关键字段被正确合并
        currency: dto.metadata.currency || existingMetadata.currency,
      } as any;
    }
    
    const updatedProduct = await this.productRepository.save(product);

    // 更新后重新索引到向量数据库
    try {
      await this.searchService.indexProduct(
        updatedProduct.id,
        updatedProduct.name,
        updatedProduct.description || '',
        {
          merchantId: updatedProduct.merchantId,
          price: updatedProduct.price,
          currency: (updatedProduct.metadata as any)?.currency || 'CNY',
          category: updatedProduct.category,
          stock: updatedProduct.stock,
        },
      );
    } catch (error) {
      // 索引失败不影响商品更新
      console.error('商品重新索引失败:', error);
    }

    // 更新后重新注册 AI 能力（重新生成 Function Schema）
    // 不指定平台，自动注册所有已注册的平台
    try {
      await this.capabilityRegistry.register(updatedProduct.id, undefined, {
        autoEnable: true,
        forceRegenerate: true,
      });
    } catch (error) {
      // 能力注册失败不影响商品更新
      console.error('AI能力重新注册失败:', error);
    }

    return updatedProduct;
  }

  async deleteProduct(merchantId: string, id: string) {
    const product = await this.productRepository.findOne({
      where: { id, merchantId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    await this.productRepository.remove(product);
    return { message: '商品已删除' };
  }

  /**
   * 获取所有支持X402的商品
   */
  async getX402Products() {
    // 查找所有启用X402的商品
    const products = await this.productRepository.find({
      where: { status: ProductStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    // 过滤出支持X402的商品
    return products.filter(product => {
      const metadata = product.metadata as any;
      return metadata?.x402Enabled === true || 
             metadata?.x402Params || 
             metadata?.paymentMethods?.includes('x402');
    });
  }

  /**
   * 自动获取并同步X402商品
   * 这个方法会从外部X402注册表获取商品信息
   */
  async autoFetchX402Products(userId: string) {
    // 模拟从X402网络获取可用商品
    // 实际实现中，这里会调用X402协议的API获取注册的商品
    const fetchedProducts = await this.fetchFromX402Network();
    
    const results = {
      total: fetchedProducts.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      products: [] as any[],
    };

    for (const x402Product of fetchedProducts) {
      // 检查是否已存在（通过externalId）
      const existing = await this.productRepository.findOne({
        where: { 
          syncSource: 'x402',
          externalId: x402Product.id,
        },
      });

      if (existing) {
        // 更新现有商品
        existing.name = x402Product.name;
        existing.description = x402Product.description;
        existing.price = x402Product.price;
        existing.metadata = {
          ...(existing.metadata as any),
          x402Enabled: true,
          x402Params: x402Product.x402Params,
          lastSyncAt: new Date().toISOString(),
        } as any;
        await this.productRepository.save(existing);
        results.updated++;
        results.products.push(existing);
      } else {
        // 创建新商品
        const newProduct = this.productRepository.create({
          merchantId: userId, // 关联到当前用户
          name: x402Product.name,
          description: x402Product.description,
          price: x402Product.price,
          stock: x402Product.stock || 999999,
          category: x402Product.category || 'X402',
          productType: x402Product.productType || 'digital',
          status: ProductStatus.ACTIVE,
          syncSource: 'x402',
          externalId: x402Product.id,
          metadata: {
            x402Enabled: true,
            x402Params: x402Product.x402Params,
            x402Network: x402Product.network,
            sourceUrl: x402Product.sourceUrl,
            lastSyncAt: new Date().toISOString(),
          } as any,
        });
        const saved = await this.productRepository.save(newProduct);
        results.imported++;
        results.products.push(saved);
      }
    }

    return results;
  }

  /**
   * 从X402网络获取商品
   * 实际实现中会调用X402协议的API
   */
  private async fetchFromX402Network(): Promise<any[]> {
    const products: any[] = [];
    
    // X402 V2 服务发现端点列表
    // 这些是已知的支持 X402 协议的服务
    const x402ServiceUrls = [
      // Coinbase X402 示例服务
      'https://raw.githubusercontent.com/coinbase/x402/master/examples/weather-service/x402.json',
      // 可以添加更多已知的 X402 服务端点
    ];

    // 尝试从每个端点获取服务信息
    for (const serviceUrl of x402ServiceUrls) {
      try {
        const response = await fetch(serviceUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000), // 5秒超时
        });

        if (response.ok) {
          const metadata = await response.json();
          
          // 转换 X402 元数据为商品格式
          if (metadata && metadata.name) {
            products.push({
              id: `x402-${Buffer.from(serviceUrl).toString('base64').slice(0, 12)}`,
              name: metadata.name,
              description: metadata.description || 'X402 服务',
              price: parseFloat(metadata.price) || 0.01,
              category: metadata.category || 'API Services',
              productType: 'api',
              network: metadata.network || 'unknown',
              x402Params: {
                scheme: metadata.scheme || 'exact',
                currency: metadata.currency || 'USDT',
                paymentAddress: metadata.paymentAddress,
                ...metadata,
              },
              sourceUrl: serviceUrl,
            });
          }
        }
      } catch (error) {
        console.warn(`从 ${serviceUrl} 获取 X402 服务失败:`, error);
        // 继续处理下一个 URL
      }
    }

    // 如果没有从真实端点获取到数据，使用默认的示例数据
    if (products.length === 0) {
      return this.getDefaultX402Products();
    }

    // 合并真实数据和默认示例
    return [...products, ...this.getDefaultX402Products()];
  }

  /**
   * 获取默认的 X402 示例商品
   */
  private getDefaultX402Products(): any[] {
    const paymentAddress = this.configService.get<string>('X402_PAYMENT_ADDRESS') || '0x742d35Cc6634C0532925a3b844Bc9e7595f82bBC';
    
    return [
      {
        id: 'x402-demo-api-1',
        name: 'AI 图像生成 API',
        description: '基于Stable Diffusion的高质量图像生成服务，支持X402协议自动付费',
        price: 0.01,
        category: 'AI Services',
        productType: 'api',
        network: 'BSC Testnet',
        x402Params: {
          paymentAddress: paymentAddress,
          pricePerRequest: '0.01',
          currency: 'USDT',
          scheme: 'exact',
          maxRequests: 1000,
        },
        sourceUrl: 'https://api.agentrix.io/x402/image-gen',
      },
      {
        id: 'x402-demo-api-2',
        name: 'GPT-4 对话 API',
        description: '支持X402协议的GPT-4 API服务，按调用次数付费',
        price: 0.005,
        category: 'AI Services',
        productType: 'api',
        network: 'BSC Testnet',
        x402Params: {
          paymentAddress: paymentAddress,
          pricePerRequest: '0.005',
          currency: 'USDT',
          scheme: 'upto',
          maxTokens: 4096,
        },
        sourceUrl: 'https://api.agentrix.io/x402/gpt4',
      },
      {
        id: 'x402-demo-data-1',
        name: '实时市场数据',
        description: '加密货币实时价格和交易数据，支持X402协议按需付费',
        price: 0.001,
        category: 'Data Services',
        productType: 'api',
        network: 'BSC Testnet',
        x402Params: {
          paymentAddress: paymentAddress,
          pricePerQuery: '0.001',
          currency: 'USDT',
          scheme: 'exact',
          dataTypes: ['price', 'volume', 'trades'],
        },
        sourceUrl: 'https://api.agentrix.io/x402/market-data',
      },
      {
        id: 'x402-demo-compute-1',
        name: 'GPU 计算服务',
        description: '按秒计费的云端 GPU 计算资源，适用于 AI 推理和训练',
        price: 0.0001,
        category: 'Compute',
        productType: 'api',
        network: 'BSC Testnet',
        x402Params: {
          paymentAddress: paymentAddress,
          pricePerSecond: '0.0001',
          currency: 'USDT',
          scheme: 'upto',
          gpuType: 'NVIDIA A100',
        },
        sourceUrl: 'https://api.agentrix.io/x402/gpu-compute',
      },
      {
        id: 'x402-demo-storage-1',
        name: '去中心化存储',
        description: 'IPFS/Filecoin 永久存储服务，支持 X402 微支付',
        price: 0.00001,
        category: 'Storage',
        productType: 'api',
        network: 'BSC Testnet',
        x402Params: {
          paymentAddress: paymentAddress,
          pricePerMB: '0.00001',
          currency: 'USDT',
          scheme: 'exact',
          storageProvider: 'IPFS',
        },
        sourceUrl: 'https://api.agentrix.io/x402/storage',
      },
    ];
  }
}

