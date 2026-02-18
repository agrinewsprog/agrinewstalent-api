import { prisma } from '../../config/database';
import { CreatePromotionDto } from './promotions.dto';

export class PromotionsRepository {
  // ============================================================
  // CREATE PROMOTION
  // ============================================================

  async create(data: CreatePromotionDto) {
    return prisma.promotion.create({
      data: {
        code: data.code,
        description: data.description,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        targetRole: data.targetRole as any,
        targetUniversityId: data.targetUniversityId,
        maxUses: data.maxUses,
      },
      include: {
        targetUniversity: {
          select: {
            id: true,
            universityName: true,
          },
        },
      },
    });
  }

  // ============================================================
  // FIND ALL PROMOTIONS
  // ============================================================

  async findAll(
    skip: number,
    take: number,
    isActive?: boolean,
    targetRole?: string
  ) {
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (targetRole) {
      where.OR = [
        { targetRole: targetRole },
        { targetRole: null },
      ];
    }

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          targetUniversity: {
            select: {
              id: true,
              universityName: true,
            },
          },
        },
      }),
      prisma.promotion.count({ where }),
    ]);

    return { promotions, total };
  }

  // ============================================================
  // FIND BY ID
  // ============================================================

  async findById(id: number) {
    return prisma.promotion.findUnique({
      where: { id },
      include: {
        targetUniversity: {
          select: {
            id: true,
            universityName: true,
          },
        },
      },
    });
  }

  // ============================================================
  // FIND BY CODE
  // ============================================================

  async findByCode(code: string) {
    return prisma.promotion.findUnique({
      where: { code },
      include: {
        targetUniversity: {
          select: {
            id: true,
            universityName: true,
          },
        },
      },
    });
  }

  // ============================================================
  // UPDATE STATUS
  // ============================================================

  async updateStatus(id: number, isActive: boolean) {
    return prisma.promotion.update({
      where: { id },
      data: { isActive },
      include: {
        targetUniversity: {
          select: {
            id: true,
            universityName: true,
          },
        },
      },
    });
  }

  // ============================================================
  // INCREMENT USAGE
  // ============================================================

  async incrementUsage(id: number) {
    return prisma.promotion.update({
      where: { id },
      data: {
        currentUses: {
          increment: 1,
        },
      },
    });
  }
}
