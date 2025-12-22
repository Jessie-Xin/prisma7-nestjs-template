import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: '邮箱地址' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({ example: '123456', description: '6位验证码' })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  @Length(6, 6, { message: '验证码必须是6位' })
  code: string;

  @ApiProperty({ example: 'NewPassword123!', description: '新密码（至少6位）' })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(6, { message: '密码至少需要6位' })
  newPassword: string;
}
