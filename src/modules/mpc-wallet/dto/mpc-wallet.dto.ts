import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateMPCWalletDto {
  @IsString()
  password: string; // 用于加密分片的密码
}

export class RecoverWalletDto {
  @IsString()
  encryptedShardA: string; // 加密的分片 A

  @IsString()
  encryptedShardC: string; // 加密的分片 C

  @IsString()
  password: string; // 解密密码
}

