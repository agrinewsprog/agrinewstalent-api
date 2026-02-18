import { PromotionsRepository } from './promotions.repository';
import { CreatePromotionDto, UpdatePromotionStatusDto, ListPromotionsDto } from './promotions.dto';

export class PromotionsService {
  private promotionsRepository: PromotionsRepository;

  constructor() {
    this.promotionsRepository = new PromotionsRepository();
  }

  // ============================================================
  // CREATE PROMOTION
  // ============================================================

  async createPromotion(dto: CreatePromotionDto) {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Check if code already exists
    const existingPromotion = await this.promotionsRepository.findByCode(dto.code);
    if (existingPromotion) {
      throw new Error('Promotion code already exists');
    }

    const promotion = await this.promotionsRepository.create(dto);

    return {
      message: 'Promotion created successfully',
      promotion,
    };
  }

  // ============================================================
  // LIST PROMOTIONS
  // ============================================================

  async listPromotions(dto: ListPromotionsDto) {
    const { page = 1, limit = 20, isActive, targetRole } = dto;
    const skip = (page - 1) * limit;

    const { promotions, total } = await this.promotionsRepository.findAll(
      skip,
      limit,
      isActive,
      targetRole
    );

    return {
      promotions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // UPDATE PROMOTION STATUS
  // ============================================================

  async updatePromotionStatus(id: number, dto: UpdatePromotionStatusDto) {
    const promotion = await this.promotionsRepository.findById(id);
    if (!promotion) {
      throw new Error('Promotion not found');
    }

    const updatedPromotion = await this.promotionsRepository.updateStatus(id, dto.isActive);

    return {
      message: `Promotion ${dto.isActive ? 'activated' : 'deactivated'} successfully`,
      promotion: updatedPromotion,
    };
  }

  // ============================================================
  // VALIDATE AND APPLY PROMOTION
  // ============================================================

  async validatePromotion(code: string, _userId: number, userRole: string, universityId?: number) {
    const promotion = await this.promotionsRepository.findByCode(code);

    if (!promotion) {
      throw new Error('Invalid promotion code');
    }

    if (!promotion.isActive) {
      throw new Error('Promotion is not active');
    }

    const now = new Date();
    if (now < promotion.startDate) {
      throw new Error('Promotion has not started yet');
    }

    if (now > promotion.endDate) {
      throw new Error('Promotion has expired');
    }

    if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
      throw new Error('Promotion has reached maximum uses');
    }

    // Check role targeting
    if (promotion.targetRole && promotion.targetRole !== userRole) {
      throw new Error('Promotion is not available for your role');
    }

    // Check university targeting
    if (promotion.targetUniversityId && promotion.targetUniversityId !== universityId) {
      throw new Error('Promotion is not available for your university');
    }

    // Increment usage
    await this.promotionsRepository.incrementUsage(promotion.id);

    return {
      message: 'Promotion applied successfully',
      promotion: {
        code: promotion.code,
        discountPercent: promotion.discountPercent,
        discountAmount: promotion.discountAmount,
      },
    };
  }
}
