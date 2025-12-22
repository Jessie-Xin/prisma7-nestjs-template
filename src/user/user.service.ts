import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/database';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(
    id: string,
    data: { email?: string; firstName?: string; lastName?: string },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
