import { Request, Response } from 'express';
import { PromotionsService } from './promotions.service';
import { createPromotionSchema, updatePromotionStatusSchema, listPromotionsSchema } from './promotions.dto';
import { prisma } from '../../config/database';

export class PromotionsController {
  private promotionsService: PromotionsService;

  constructor() {
    this.promotionsService = new PromotionsService();
  }

  // ============================================================
  // CREATE PROMOTION (SUPER_ADMIN only)
  // ============================================================

  createPromotion = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = createPromotionSchema.parse(req.body);
      const result = await this.promotionsService.createPromotion(dto);

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // LIST PROMOTIONS
  // ============================================================

  listPromotions = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = listPromotionsSchema.parse(req.query);
      const result = await this.promotionsService.listPromotions(dto);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // UPDATE PROMOTION STATUS (SUPER_ADMIN only)
  // ============================================================

  updatePromotionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string);
      const dto = updatePromotionStatusSchema.parse(req.body);
      const result = await this.promotionsService.updatePromotionStatus(id, dto);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Promotion not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // VALIDATE PROMOTION CODE
  // ============================================================

  validatePromotion = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const code = req.params.code as string;
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      // Get university ID if student
      let universityId: number | undefined;
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId },
        include: {
          universityMembership: true,
        },
      });

      if (studentProfile?.universityMembership) {
        universityId = studentProfile.universityMembership.universityId;
      }

      const result = await this.promotionsService.validatePromotion(
        code,
        userId,
        userRole,
        universityId
      );

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
