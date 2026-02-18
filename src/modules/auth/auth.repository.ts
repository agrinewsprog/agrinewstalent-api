import { User, RefreshToken, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  async saveRefreshToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findUserRefreshTokens(userId: number): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany({
      where: { userId },
    });
  }

  async deleteRefreshTokenById(id: number): Promise<void> {
    await prisma.refreshToken.delete({
      where: { id },
    });
  }

  async deleteAllUserRefreshTokens(userId: number): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async deleteExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
