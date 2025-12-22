import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/config/database/prisma.service';
import { EmailService } from 'src/email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * 生成6位随机验证码
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    // 确保 expiresIn 是数字类型（秒）
    const accessTokenExpiresIn = parseInt(
      this.configService.get<string>('JWT_EXPIRES_IN') || '900',
      10,
    ); // 15分钟
    const refreshTokenExpiresIn = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '604800',
      10,
    ); // 7天

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      expiresIn: accessTokenExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-key',
      expiresIn: refreshTokenExpiresIn,
    });

    // 计算刷新令牌过期时间（基于配置的秒数）
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + refreshTokenExpiresIn);

    // 保存刷新令牌到数据库
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName } = registerDto;

    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('该邮箱已被注册');
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 生成验证码
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 10); // 10分钟后过期

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        verificationCode,
        verificationCodeExpiry,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // 发送验证邮件
    await this.emailService.sendVerificationCode(email, verificationCode);

    return {
      message: '注册成功！验证码已发送到您的邮箱，请在10分钟内验证。',
      user,
    };
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, code } = verifyEmailDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (user.emailVerified) {
      throw new BadRequestException('邮箱已验证');
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      throw new BadRequestException('验证码不存在，请重新注册');
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('验证码错误');
    }

    if (new Date() > user.verificationCodeExpiry) {
      throw new BadRequestException('验证码已过期，请重新注册');
    }

    // 更新用户状态
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    });

    // 发送欢迎邮件
    await this.emailService.sendWelcomeEmail(email, `${user.firstName} ${user.lastName}`);

    // 生成令牌
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      message: '邮箱验证成功！',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 检查邮箱是否已验证
    if (!user.emailVerified) {
      throw new UnauthorizedException('邮箱未验证，请先验证邮箱');
    }

    // 生成令牌
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      message: '登录成功！',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string) {
    try {
      // 验证刷新令牌
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-key',
      });

      // 检查刷新令牌是否存在于数据库
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 检查是否过期
      if (new Date() > storedToken.expiresAt) {
        // 删除过期的令牌
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('刷新令牌已过期');
      }

      // 生成新的访问令牌
      const accessTokenExpiresIn = parseInt(
        this.configService.get<string>('JWT_EXPIRES_IN') || '900',
        10,
      );
      const accessToken = this.jwtService.sign(
        { sub: payload.sub, email: payload.email },
        {
          secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
          expiresIn: accessTokenExpiresIn,
        },
      );

      return {
        accessToken,
        refreshToken, // 刷新令牌保持不变
      };
    } catch (error) {
      throw new UnauthorizedException('无效或过期的刷新令牌');
    }
  }

  /**
   * 忘记密码 - 发送重置验证码
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 为了安全，不透露用户是否存在
      return {
        message: '如果该邮箱已注册，重置密码验证码将发送到您的邮箱。',
      };
    }

    // 生成重置密码验证码
    const resetPasswordCode = this.generateVerificationCode();
    const resetPasswordCodeExpiry = new Date();
    resetPasswordCodeExpiry.setMinutes(resetPasswordCodeExpiry.getMinutes() + 10); // 10分钟后过期

    // 更新用户
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordCode,
        resetPasswordCodeExpiry,
      },
    });

    // 发送重置密码邮件
    await this.emailService.sendPasswordResetCode(email, resetPasswordCode);

    return {
      message: '如果该邮箱已注册，重置密码验证码将发送到您的邮箱。',
    };
  }

  /**
   * 重置密码
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, code, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (!user.resetPasswordCode || !user.resetPasswordCodeExpiry) {
      throw new BadRequestException('重置密码验证码不存在，请重新申请');
    }

    if (user.resetPasswordCode !== code) {
      throw new BadRequestException('验证码错误');
    }

    if (new Date() > user.resetPasswordCodeExpiry) {
      throw new BadRequestException('验证码已过期，请重新申请');
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码并清除重置验证码
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordCode: null,
        resetPasswordCodeExpiry: null,
      },
    });

    // 删除所有刷新令牌（强制用户重新登录）
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    return {
      message: '密码重置成功！请使用新密码登录。',
    };
  }

  /**
   * 登出
   */
  async logout(refreshToken: string) {
    // 删除刷新令牌
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return {
      message: '登出成功！',
    };
  }

  /**
   * 重新发送验证码
   */
  async resendVerificationCode(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (user.emailVerified) {
      throw new BadRequestException('邮箱已验证');
    }

    // 生成新验证码
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 10);

    // 更新用户
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationCodeExpiry,
      },
    });

    // 发送验证邮件
    await this.emailService.sendVerificationCode(email, verificationCode);

    return {
      message: '验证码已重新发送到您的邮箱。',
    };
  }
}
