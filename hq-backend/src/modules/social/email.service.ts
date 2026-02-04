/**
 * Email Service
 * 
 * 邮件发送服务，支持自动化邮件营销和通知
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlTemplate: string;
  variables: string[];
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string = '';
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.zoho.com');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 465);

    if (!smtpUser || !smtpPassword) {
      this.logger.warn('⚠️ SMTP credentials not configured, email service disabled');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      // 验证连接
      await this.transporter.verify();
      this.fromEmail = smtpUser;
      this.isConfigured = true;
      this.logger.log(`✅ Email service initialized (${smtpUser})`);
    } catch (error) {
      this.logger.error('Failed to initialize email service:', error.message);
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter || !this.isConfigured) {
      this.logger.error('Email service not configured');
      return false;
    }

    try {
      const result = await this.transporter.sendMail({
        from: `Agentrix <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      this.logger.log(`Email sent successfully: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Welcome to Agentrix! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">Welcome to Agentrix!</h1>
          <p>Hi ${userName},</p>
          <p>Thank you for joining Agentrix - the unified AI Agent ecosystem platform.</p>
          <h2>Getting Started</h2>
          <ul>
            <li>🤖 Explore our AI Agents marketplace</li>
            <li>💰 Set up your payment methods</li>
            <li>🔧 Check out the SDK documentation</li>
          </ul>
          <p>If you have any questions, feel free to reach out!</p>
          <p>Best regards,<br/>The Agentrix Team</p>
        </div>
      `,
    });
  }

  /**
   * 发送营销邮件
   */
  async sendMarketingEmail(
    recipients: string[],
    subject: string,
    content: string,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const to of recipients) {
      const success = await this.sendEmail({
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${content}
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 12px; color: #6b7280;">
              You're receiving this email because you signed up for Agentrix.
              <a href="#">Unsubscribe</a>
            </p>
          </div>
        `,
      });

      if (success) {
        sent++;
      } else {
        failed++;
      }

      // 避免发送过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { sent, failed };
  }

  /**
   * 发送告警邮件
   */
  async sendAlertEmail(to: string | string[], alertType: string, message: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `[Agentrix Alert] ${alertType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">⚠️ Alert: ${alertType}</h1>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
            ${message}
          </div>
          <p>Please check the Agentrix HQ dashboard for more details.</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
      `,
    });
  }

  /**
   * 检查服务状态
   */
  getStatus(): { configured: boolean; email: string | null } {
    return {
      configured: this.isConfigured,
      email: this.isConfigured ? this.fromEmail : null,
    };
  }
}
