import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { MerchantProfile } from '../../entities/merchant-profile.entity';

export interface UpdateMerchantProfileDto {
  businessName?: string;
  businessLicense?: string;
  businessDescription?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
  businessInfo?: {
    registrationDate?: Date;
    registrationCountry?: string;
    taxId?: string;
    industry?: string;
  };
}

@Injectable()
export class MerchantProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MerchantProfile)
    private merchantProfileRepository: Repository<MerchantProfile>,
  ) {}

  async getProfile(userId: string) {
    // 检查用户是否有MERCHANT角色
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    
    if (!user || !user.roles.includes(UserRole.MERCHANT)) {
      throw new NotFoundException('用户不是商户');
    }
    
    // 查找或创建profile
    let profile = await this.merchantProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
    
    if (!profile) {
      // 创建默认profile
      profile = this.merchantProfileRepository.create({
        userId,
        businessName: user.nickname || user.email || '未命名商户',
        contactInfo: {
          email: user.email,
        },
      });
      profile = await this.merchantProfileRepository.save(profile);
    }
    
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateMerchantProfileDto) {
    const profile = await this.getProfile(userId);
    
    Object.assign(profile, dto);
    
    return this.merchantProfileRepository.save(profile);
  }
}

