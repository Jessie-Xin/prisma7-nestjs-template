import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: '邮箱地址' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({ example: 'Password123!', description: '密码（至少6位）' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少需要6位' })
  password: string;

  @ApiProperty({ example: 'John', description: '名' })
  @IsString()
  @IsNotEmpty({ message: '名不能为空' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: '姓' })
  @IsString()
  @IsNotEmpty({ message: '姓不能为空' })
  lastName: string;
}
