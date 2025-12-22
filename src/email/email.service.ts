import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.auth.user'),
        pass: this.configService.get<string>('email.auth.pass'),
      },
    });
  }

  /**
   * 发送邮箱验证码
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    const from = this.configService.get<string>('email.from');

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: '邮箱验证码',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">邮箱验证</h2>
            <p>您的验证码是：</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666;">此验证码将在 10 分钟后过期。</p>
            <p style="color: #999; font-size: 12px;">如果这不是您的操作，请忽略此邮件。</p>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error.stack);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * 发送密码重置验证码
   */
  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const from = this.configService.get<string>('email.from');

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: '重置密码验证码',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">重置密码</h2>
            <p>您请求重置密码。您的验证码是：</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666;">此验证码将在 10 分钟后过期。</p>
            <p style="color: #999; font-size: 12px;">如果这不是您的操作，请立即联系我们。</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error.stack);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const from = this.configService.get<string>('email.from');

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: '欢迎注册',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">欢迎，${name}！</h2>
            <p>感谢您注册我们的服务。</p>
            <p>您的账号已经成功创建并验证。</p>
            <p style="color: #666; margin-top: 20px;">如有任何问题，请随时联系我们。</p>
          </div>
        `,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error.stack);
      // 欢迎邮件发送失败不抛出错误，不影响主流程
    }
  }
}
