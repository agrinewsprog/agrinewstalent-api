import { Router } from 'express';
import { PromotionsController } from './promotions.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import { createPromotionSchema, updatePromotionStatusSchema, listPromotionsSchema } from './promotions.dto';

const router = Router();
const controller = new PromotionsController();

// ============================================================
// PUBLIC ROUTES (authenticated)
// ============================================================

/**
 * @route   GET /api/promotions
 * @desc    List promotions
 * @access  Authenticated
 */
router.get(
  '/',
  authenticate,
  validate(listPromotionsSchema, 'query'),
  controller.listPromotions
);

/**
 * @route   GET /api/promotions/:code/validate
 * @desc    Validate and apply promotion code
 * @access  Authenticated
 */
router.get(
  '/:code/validate',
  authenticate,
  controller.validatePromotion
);

// ============================================================
// ADMIN ROUTES (SUPER_ADMIN only)
// ============================================================

/**
 * @route   POST /api/promotions/admin/create
 * @desc    Create promotion (SUPER_ADMIN only)
 * @access  SUPER_ADMIN
 */
router.post(
  '/admin/create',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(createPromotionSchema),
  controller.createPromotion
);

/**
 * @route   PATCH /api/promotions/admin/:id
 * @desc    Update promotion status (SUPER_ADMIN only)
 * @access  SUPER_ADMIN
 */
router.patch(
  '/admin/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(updatePromotionStatusSchema),
  controller.updatePromotionStatus
);

export default router;
