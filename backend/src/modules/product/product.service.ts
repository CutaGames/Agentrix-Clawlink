import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product, ProductStatus, ProductType } from '../../entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { SearchService } from '../search/search.service';
import { CapabilityRegistryService } from '../ai-capability/services/capability-registry.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @Inject(forwardRef(() => SearchService))
    private searchService: SearchService,
    @Inject(forwardRef(() => CapabilityRegistryService))
    private capabilityRegistry: CapabilityRegistryService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService,
  ) {}

  async getProducts(search?: string, merchantId?: string, status?: string) {
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
      status: ProductStatus.PENDING_REVIEW,
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

    // 发送通知给商户
    try {
      await this.notificationService.createNotification(merchantId, {
        type: NotificationType.SYSTEM,
        title: '商品提交成功',
        message: `您的商品 "${savedProduct.name}" 已提交审核，预计将在1个工作日内完成审核。`,
        actionUrl: `/app/merchant/products`,
      });
    } catch (error) {
      console.error('发送通知失败:', error);
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
   * Phase 3: Service Discovery
   * 从 URL 自动发现并注册服务
   */
  async discoverFromUrl(url: string, merchantId: string): Promise<Product> {
    try {
      // 1. 尝试获取 x402.json
      // 优先尝试 /.well-known/x402.json，如果失败则尝试 url 本身
      let metadataUrl = url;
      if (!url.endsWith('x402.json')) {
        metadataUrl = url.endsWith('/') ? `${url}.well-known/x402.json` : `${url}/.well-known/x402.json`;
      }

      // 使用 global fetch (Node 18+)
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        // 如果 .well-known 失败，尝试直接访问 URL (假设 URL 本身返回 metadata)
        const directResponse = await fetch(url);
        if (!directResponse.ok) {
           throw new Error(`Failed to fetch x402 metadata from ${url}`);
        }
        // 检查 Content-Type 是否为 JSON
        const contentType = directResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
             throw new Error(`URL ${url} did not return JSON metadata`);
        }
        // 使用直接响应
        return this.createProductFromMetadata(await directResponse.json(), merchantId, url);
      }

      return this.createProductFromMetadata(await response.json(), merchantId, url);
    } catch (error) {
      throw new Error(`Service discovery failed: ${error.message}`);
    }
  }

  private async createProductFromMetadata(metadata: any, merchantId: string, sourceUrl: string): Promise<Product> {
      // 验证必要字段
      if (!metadata.name || !metadata.price) {
          throw new Error('Invalid x402 metadata: missing name or price');
      }

      const product = this.productRepository.create({
          merchantId,
          name: metadata.name,
          description: metadata.description || 'Imported via X402 Discovery',
          price: metadata.price,
          productType: ProductType.SERVICE,
          category: metadata.category || 'API',
          status: ProductStatus.ACTIVE, // 自动上架
          metadata: {
              ...metadata,
              sourceUrl,
              importedAt: new Date().toISOString(),
              x402: {
                  scheme: metadata.scheme || 'exact',
                  network: metadata.network || 'base',
                  recipient: metadata.recipient,
                  token: metadata.token
              }
          }
      });

      return this.productRepository.save(product);
  }
}

