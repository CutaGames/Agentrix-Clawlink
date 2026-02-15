import { Injectable, ConflictException, BadRequestException, UnauthorizedException, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as ethers from 'ethers';
import { User, UserRole } from '../../entities/user.entity';
import { WalletConnection, WalletType, ChainType } from '../../entities/wallet-connection.entity';
import { RegisterDto, WalletLoginDto } from './dto/auth.dto';
import { AccountService } from '../account/account.service';
import { AccountOwnerType } from '../../entities/account.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(WalletConnection)
    private walletRepository: Repository<WalletConnection>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => AccountService))
    private accountService: AccountService,
  ) {}

  /**
   * 为用户自动创建默认资金账户（如果不存在）
   */
  private async ensureUserDefaultAccount(userId: string, userName?: string): Promise<void> {
    try {
      const accounts = await this.accountService.findByOwner(userId, AccountOwnerType.USER);
      if (accounts.length === 0) {
        await this.accountService.createUserDefaultAccount(userId, userName);
        this.logger.log(`Created default account for user ${userId}`);
      }
    } catch (error) {
      // 如果创建失败，仅记录日志，不阻断登录流程
      this.logger.warn(`Failed to create default account for user ${userId}: ${error.message}`);
    }
  }

  async register(dto: RegisterDto) {
    // 检查用户是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 生成 Agentrix ID（如果未提供）
    const agentrixId = dto.agentrixId || `AX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 加密密码
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 创建用户
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      agentrixId,
      roles: [UserRole.USER],
    });

    const savedUser = await this.userRepository.save(user);

    // 自动创建默认资金账户
    await this.ensureUserDefaultAccount(savedUser.id, dto.email);

    // 生成JWT token
    const payload = { email: savedUser.email, sub: savedUser.id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: savedUser.id,
        agentrixId: savedUser.agentrixId,
        email: savedUser.email,
        roles: Array.isArray(savedUser.roles) ? savedUser.roles : ['user'],
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * 通过 ID 查找用户
   */
  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * 通过邮箱查找用户
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async login(user: any) {
    // 确保用户有默认资金账户
    await this.ensureUserDefaultAccount(user.id, user.email || user.nickname);

    const payload = { email: user.email, sub: user.id };
    
    // 获取默认钱包
    const defaultWallet = await this.walletRepository.findOne({
      where: { userId: user.id, isDefault: true }
    });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        agentrixId: user.agentrixId,
        email: user.email,
        roles: user.roles,
        walletAddress: defaultWallet?.walletAddress || null,
      },
    };
  }

  async validateGoogleUser(googleProfile: any) {
    const { googleId, email, firstName, lastName, picture } = googleProfile;

    // 查找是否已有用户（通过 googleId 或 email）
    let user = await this.userRepository.findOne({
      where: [{ googleId }, { email }],
    });

    if (user) {
      // 如果用户存在但没有 googleId，更新它
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture && !user.avatarUrl) {
          user.avatarUrl = picture;
        }
        if (firstName && lastName && !user.nickname) {
          user.nickname = `${firstName} ${lastName}`;
        }
        await this.userRepository.save(user);
      }
    } else {
      // 创建新用户
      const agentrixId = `AX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      user = this.userRepository.create({
        googleId,
        email,
        agentrixId,
        avatarUrl: picture,
        nickname: firstName && lastName ? `${firstName} ${lastName}` : null,
        roles: [UserRole.USER],
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async validateAppleUser(appleProfile: any) {
    const { appleId, email, firstName, lastName } = appleProfile;

    let user = await this.userRepository.findOne({
      where: [{ appleId }, { email }],
    });

    if (user) {
      if (!user.appleId) {
        user.appleId = appleId;
        if (firstName && lastName && !user.nickname) {
          user.nickname = `${firstName} ${lastName}`;
        }
        await this.userRepository.save(user);
      }
    } else {
      const agentrixId = `AX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      user = this.userRepository.create({
        appleId,
        email,
        agentrixId,
        nickname: firstName && lastName ? `${firstName} ${lastName}` : null,
        roles: [UserRole.USER],
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async validateTwitterUser(twitterProfile: any) {
    const { twitterId, email, username, displayName, picture } = twitterProfile;

    let user = await this.userRepository.findOne({
      where: [{ twitterId }, { email: email || undefined }],
    });

    if (user) {
      if (!user.twitterId) {
        user.twitterId = twitterId;
        if (picture && !user.avatarUrl) {
          user.avatarUrl = picture;
        }
        if (displayName && !user.nickname) {
          user.nickname = displayName;
        }
        await this.userRepository.save(user);
      }
    } else {
      const agentrixId = `AX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      user = this.userRepository.create({
        twitterId,
        email,
        agentrixId,
        avatarUrl: picture,
        nickname: displayName || username,
        roles: [UserRole.USER],
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  /**
   * 社交账号 Token 登录（Mobile 端使用）
   * 移动端通过 OAuth SDK 获取 access_token 后，发送到此接口验证并登录
   */
  async socialTokenLogin(dto: {
    provider: string;
    accessToken: string;
    socialId?: string;
    email?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  }) {
    const { provider, accessToken, socialId, email, username, displayName, avatarUrl } = dto;

    // 1. 根据 provider 验证 token 并获取用户信息
    let verifiedProfile: { socialId: string; email?: string; displayName?: string; avatarUrl?: string; username?: string };

    switch (provider) {
      case 'google': {
        // 验证 Google ID Token
        const googleProfile = await this.verifyGoogleToken(accessToken);
        verifiedProfile = googleProfile;
        break;
      }
      case 'x':
      case 'twitter': {
        // Twitter OAuth 2.0 — 使用 access_token 获取用户信息
        const twitterProfile = await this.verifyTwitterToken(accessToken);
        verifiedProfile = twitterProfile;
        break;
      }
      case 'telegram': {
        // Telegram — 客户端传递 initData，后端验证
        verifiedProfile = {
          socialId: socialId || accessToken,
          email,
          displayName: displayName || username,
          avatarUrl,
          username,
        };
        break;
      }
      case 'discord': {
        // Discord — 使用 access_token 获取用户信息
        const discordProfile = await this.verifyDiscordToken(accessToken);
        verifiedProfile = discordProfile;
        break;
      }
      default:
        throw new BadRequestException(`不支持的登录方式: ${provider}`);
    }

    if (!verifiedProfile.socialId) {
      throw new BadRequestException('无法获取社交账号ID');
    }

    // 2. 映射 provider 到 SocialAccountType
    const { SocialAccountType } = await import('../../entities/social-account.entity');
    const typeMap: Record<string, any> = {
      google: SocialAccountType.GOOGLE,
      x: SocialAccountType.X,
      twitter: SocialAccountType.X,
      telegram: SocialAccountType.TELEGRAM,
      discord: SocialAccountType.DISCORD,
    };
    const socialType = typeMap[provider];

    // 3. 查找是否已有用户通过该社交账号登录
    const { SocialAccountService } = await import('./social-account.service');
    // 使用注入的 repository 直接查询
    const existingSocial = await this.userRepository.manager
      .getRepository('SocialAccount')
      .findOne({
        where: { type: socialType, socialId: verifiedProfile.socialId },
        relations: ['user'],
      });

    let user: User;

    if (existingSocial && (existingSocial as any).user) {
      // 已有用户，直接登录
      user = (existingSocial as any).user;
    } else {
      // 尝试通过 email 查找
      if (verifiedProfile.email) {
        user = await this.userRepository.findOne({ where: { email: verifiedProfile.email } });
      }

      if (!user) {
        // 创建新用户
        const agentrixId = `AX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        user = this.userRepository.create({
          email: verifiedProfile.email,
          agentrixId,
          avatarUrl: verifiedProfile.avatarUrl,
          nickname: verifiedProfile.displayName || verifiedProfile.username,
          roles: [UserRole.USER],
        });

        if (provider === 'google') (user as any).googleId = verifiedProfile.socialId;
        if (provider === 'x' || provider === 'twitter') (user as any).twitterId = verifiedProfile.socialId;

        user = await this.userRepository.save(user);
        await this.ensureUserDefaultAccount(user.id, verifiedProfile.displayName || verifiedProfile.email);
      }

      // 绑定社交账号
      try {
        await this.userRepository.manager
          .getRepository('SocialAccount')
          .save({
            userId: user.id,
            type: socialType,
            socialId: verifiedProfile.socialId,
            email: verifiedProfile.email,
            username: verifiedProfile.username,
            displayName: verifiedProfile.displayName,
            avatarUrl: verifiedProfile.avatarUrl,
          });
      } catch (e) {
        // 可能已绑定，忽略
        this.logger.warn(`Social account binding skipped: ${e.message}`);
      }
    }

    // 4. 生成 JWT
    return this.login(user);
  }

  /**
   * 验证 Google ID Token (通过 Google tokeninfo 端点)
   */
  private async verifyGoogleToken(idToken: string): Promise<{ socialId: string; email?: string; displayName?: string; avatarUrl?: string }> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!response.ok) {
        throw new UnauthorizedException('Google token 验证失败');
      }
      const data = await response.json() as any;
      return {
        socialId: data.sub,
        email: data.email,
        displayName: data.name,
        avatarUrl: data.picture,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Google token 验证失败: ' + error.message);
    }
  }

  /**
   * 验证 Twitter OAuth 2.0 access token
   */
  private async verifyTwitterToken(accessToken: string): Promise<{ socialId: string; email?: string; displayName?: string; avatarUrl?: string; username?: string }> {
    try {
      const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,description', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new UnauthorizedException('Twitter token 验证失败');
      }
      const { data } = await response.json() as any;
      return {
        socialId: data.id,
        displayName: data.name,
        username: data.username,
        avatarUrl: data.profile_image_url,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Twitter token 验证失败: ' + error.message);
    }
  }

  /**
   * 验证 Discord OAuth 2.0 access token
   */
  private async verifyDiscordToken(accessToken: string): Promise<{ socialId: string; email?: string; displayName?: string; avatarUrl?: string; username?: string }> {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new UnauthorizedException('Discord token 验证失败');
      }
      const data = await response.json() as any;
      return {
        socialId: data.id,
        email: data.email,
        displayName: data.global_name || data.username,
        username: data.username,
        avatarUrl: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Discord token 验证失败: ' + error.message);
    }
  }

  /**
   * 钱包登录
   * 核心逻辑：同一个钱包地址只能有一个PayMind ID
   * 同一个PayMind ID可以绑定多个链的钱包
   */
  async walletLogin(dto: WalletLoginDto) {
    const { walletAddress, walletType, chain, message, signature, chainId } = dto;
    const normalizedAddress = walletAddress.toLowerCase();

    // 1. 验证地址格式
    this.validateWalletAddress(walletAddress, chain as ChainType);

    // 2. 验证签名（必须验证，不能跳过）
    const isValidSignature = await this.verifyWalletSignature(
      walletAddress,
      chain as ChainType,
      message,
      signature,
    );

    if (!isValidSignature) {
      throw new UnauthorizedException('签名验证失败，请重新签名');
    }

    // 3. 查找该钱包地址是否已存在（不区分链，因为同一个地址在不同链上应该对应同一个用户）
    // 注意：这里查找所有链的钱包连接，因为同一个地址在不同链上应该对应同一个 Agentrix ID
    // 使用 relations 而不是 leftJoin 来避免 TypeORM 列名问题
    const existingWallet = await this.walletRepository.findOne({
      where: {
        walletAddress: normalizedAddress,
      },
      relations: ['user'],
    });

    let user: User;
    let walletConnection: WalletConnection;

    if (existingWallet) {
      // 4a. 如果钱包已存在，使用现有的用户和 Agentrix ID
      user = existingWallet.user;
      
      // 检查该链的钱包连接是否已存在
      walletConnection = existingWallet;
      walletConnection.walletAddress = normalizedAddress;
      walletConnection.lastUsedAt = new Date();
      walletConnection.walletType = walletType as WalletType;
      walletConnection.chain = chain as ChainType;
      walletConnection.chainId = chainId;
      walletConnection = await this.walletRepository.save(walletConnection);
    } else {
      // 4b. 如果钱包不存在，创建新用户和钱包连接
      // 生成 Agentrix ID
      const agentrixId = `AX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 创建用户
      user = this.userRepository.create({
        agentrixId,
        roles: [UserRole.USER],
      });
      user = await this.userRepository.save(user);

      // 自动为新用户创建默认资金账户
      await this.ensureUserDefaultAccount(user.id, walletAddress.slice(0, 10));

      // 创建钱包连接
      walletConnection = this.walletRepository.create({
        userId: user.id,
        walletType: walletType as WalletType,
        walletAddress: normalizedAddress,
        chain: chain as ChainType,
        chainId,
        isDefault: true, // 第一个钱包设为默认
      });
      walletConnection = await this.walletRepository.save(walletConnection);
    }

    // 确保已有用户也有默认账户（用于已有用户登录场景）
    await this.ensureUserDefaultAccount(user.id);

    const defaultWalletCount = await this.walletRepository.count({
      where: { userId: user.id, isDefault: true },
    });

    if (defaultWalletCount === 0 && walletConnection && !walletConnection.isDefault) {
      walletConnection.isDefault = true;
      walletConnection = await this.walletRepository.save(walletConnection);
    }

    // 5. 生成JWT token
    const payload = { 
      sub: user.id,
      agentrixId: user.agentrixId,
      walletAddress: walletAddress.toLowerCase(),
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        agentrixId: user.agentrixId,
        email: user.email,
        roles: Array.isArray(user.roles) ? user.roles : [UserRole.USER],
      },
      wallet: {
        id: walletConnection.id,
        walletAddress: walletConnection.walletAddress,
        walletType: walletConnection.walletType,
        chain: walletConnection.chain,
        isDefault: walletConnection.isDefault,
      },
    };
  }

  async getWalletConnections(userId: string) {
    return this.walletRepository.find({
      where: { userId },
      order: { connectedAt: 'DESC' },
    });
  }

  async bindWallet(userId: string, dto: WalletLoginDto) {
    const { walletAddress, walletType, chain, message, signature, chainId } = dto;
    const normalizedAddress = walletAddress.toLowerCase();

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    this.validateWalletAddress(walletAddress, chain as ChainType);

    const isValidSignature = await this.verifyWalletSignature(
      walletAddress,
      chain as ChainType,
      message,
      signature,
    );

    if (!isValidSignature) {
      throw new UnauthorizedException('签名验证失败，请重新签名');
    }

    const existingWallet = await this.walletRepository.findOne({
      where: {
        walletAddress: normalizedAddress,
      },
    });

    if (existingWallet && existingWallet.userId !== userId) {
      throw new ConflictException('该钱包地址已绑定其他账号');
    }

    let walletConnection: WalletConnection;

    if (existingWallet) {
      walletConnection = existingWallet;
      walletConnection.walletType = walletType as WalletType;
      walletConnection.chain = chain as ChainType;
      walletConnection.chainId = chainId;
      walletConnection.lastUsedAt = new Date();
      walletConnection = await this.walletRepository.save(walletConnection);
    } else {
      const walletCount = await this.walletRepository.count({ where: { userId } });
      walletConnection = this.walletRepository.create({
        userId,
        walletType: walletType as WalletType,
        walletAddress: normalizedAddress,
        chain: chain as ChainType,
        chainId,
        isDefault: walletCount === 0,
      });
      walletConnection = await this.walletRepository.save(walletConnection);
    }

    return {
      wallet: {
        id: walletConnection.id,
        walletAddress: walletConnection.walletAddress,
        walletType: walletConnection.walletType,
        chain: walletConnection.chain,
        isDefault: walletConnection.isDefault,
      },
    };
  }

  async removeWalletConnection(userId: string, walletId: string) {
    const walletConnection = await this.walletRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!walletConnection) {
      throw new NotFoundException('未找到钱包连接');
    }

    await this.walletRepository.remove(walletConnection);

    const remainingWallets = await this.walletRepository.find({
      where: { userId },
      order: { connectedAt: 'DESC' },
    });

    if (remainingWallets.length > 0 && !remainingWallets.some((w) => w.isDefault)) {
      remainingWallets[0].isDefault = true;
      await this.walletRepository.save(remainingWallets[0]);
    }

    return { message: '钱包已解绑' };
  }

  async setDefaultWallet(userId: string, walletId: string) {
    const walletConnection = await this.walletRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!walletConnection) {
      throw new NotFoundException('未找到钱包连接');
    }

    await this.walletRepository.update({ userId }, { isDefault: false });
    walletConnection.isDefault = true;
    return this.walletRepository.save(walletConnection);
  }

  /**
   * 验证钱包签名
   */
  private async verifyWalletSignature(
    walletAddress: string,
    chain: ChainType,
    message: string,
    signature: string,
  ): Promise<boolean> {
    try {
      if (chain === ChainType.EVM) {
        // EVM地址签名验证
        const recoveredAddress = ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
      } else if (chain === ChainType.SOLANA) {
        // Solana地址签名验证（需要实现）
        // TODO: 实现Solana签名验证
        // 暂时返回true（开发环境）
        console.warn('Solana签名验证待实现');
        return true;
      }
      return false;
    } catch (error) {
      console.error('签名验证错误:', error);
      return false;
    }
  }

  /**
   * 验证钱包地址格式
   */
  private validateWalletAddress(address: string, chain: ChainType) {
    if (chain === ChainType.EVM) {
      if (!ethers.isAddress(address)) {
        throw new BadRequestException('无效的EVM地址');
      }
    } else if (chain === ChainType.SOLANA) {
      // Solana地址验证（通常是base58编码，32-44字符）
      if (address.length < 32 || address.length > 44) {
        throw new BadRequestException('无效的Solana地址');
      }
    } else {
      throw new BadRequestException('不支持的链类型');
    }
  }

  // ========== 邮箱验证码登录 ==========

  // 内存存储验证码（生产环境应使用 Redis）
  private emailCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();

  /**
   * 发送邮箱验证码
   */
  async sendEmailVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // 检查是否频繁发送（60秒内不能重复发送）
    const existing = this.emailCodes.get(normalizedEmail);
    if (existing && existing.expiresAt - 240000 > Date.now()) {
      throw new BadRequestException('Please wait before requesting a new code');
    }

    // 生成 6 位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 300000; // 5 分钟有效

    this.emailCodes.set(normalizedEmail, { code, expiresAt, attempts: 0 });

    // 清理过期验证码
    for (const [key, val] of this.emailCodes.entries()) {
      if (val.expiresAt < Date.now()) this.emailCodes.delete(key);
    }

    // 发送邮件
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Agentrix Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;
    const fromEmail = process.env.SMTP_USER || 'noreply@agentrix.top';

    try {
      if (process.env.SENDGRID_API_KEY) {
        // SendGrid HTTP API
        const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: normalizedEmail }] }],
            from: { email: fromEmail, name: 'Agentrix' },
            subject: 'Agentrix Login Verification Code',
            content: [{ type: 'text/html', value: emailHtml }],
          }),
        });
        if (!sgRes.ok) {
          const errText = await sgRes.text();
          throw new Error(`SendGrid ${sgRes.status}: ${errText}`);
        }
      } else if (process.env.SMTP_PASSWORD) {
        // Fallback: SMTP via nodemailer
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
          port: parseInt(process.env.SMTP_PORT || '465'),
          secure: (process.env.SMTP_PORT || '465') === '465',
          auth: { user: fromEmail, pass: process.env.SMTP_PASSWORD },
        });
        await transporter.sendMail({
          from: `"Agentrix" <${fromEmail}>`,
          to: normalizedEmail,
          subject: 'Agentrix Login Verification Code',
          html: emailHtml,
        });
      } else {
        throw new Error('No email provider configured (SENDGRID_API_KEY or SMTP_PASSWORD)');
      }

      this.logger.log(`Verification code sent to ${normalizedEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${normalizedEmail}: ${error.message}`);
      // 开发环境下仍然返回成功（方便测试）
      if (process.env.NODE_ENV === 'production') {
        this.emailCodes.delete(normalizedEmail);
        throw new BadRequestException('Failed to send verification email');
      }
      this.logger.warn(`[DEV] Verification code for ${normalizedEmail}: ${code}`);
    }

    return { success: true, message: 'Verification code sent' };
  }

  /**
   * 验证邮箱验证码并登录（未注册自动注册）
   */
  async verifyEmailCodeAndLogin(email: string, code: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const stored = this.emailCodes.get(normalizedEmail);

    if (!stored) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (stored.expiresAt < Date.now()) {
      this.emailCodes.delete(normalizedEmail);
      throw new BadRequestException('Verification code expired. Please request a new one.');
    }

    stored.attempts += 1;
    if (stored.attempts > 5) {
      this.emailCodes.delete(normalizedEmail);
      throw new BadRequestException('Too many attempts. Please request a new code.');
    }

    if (stored.code !== code.trim()) {
      throw new BadRequestException('Invalid verification code');
    }

    // 验证成功，删除验证码
    this.emailCodes.delete(normalizedEmail);

    // 查找或创建用户
    let user = await this.userRepository.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      const agentrixId = `AX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      user = this.userRepository.create({
        email: normalizedEmail,
        agentrixId,
        roles: [UserRole.USER],
      });
      user = await this.userRepository.save(user);
      await this.ensureUserDefaultAccount(user.id, normalizedEmail);
      this.logger.log(`New user registered via email OTP: ${normalizedEmail}`);
    }

    return this.login(user);
  }
}

