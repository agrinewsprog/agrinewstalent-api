import { Router } from 'express';
import { AgreementsController } from './agreements.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import { createAgreementSchema, updateAgreementStatusSchema, listAgreementsSchema } from './agreements.dto';

const router = Router();
const controller = new AgreementsController();

// ============================================================
// PUBLIC ROUTES (authenticated)
// ============================================================

/**
 * @route   GET /api/agreements
 * @desc    List agreements
 * @access  Authenticated
 */
router.get(
  '/',
  authenticate,
  validate(listAgreementsSchema, 'query'),
  controller.listAgreements
);

/**
 * @route   GET /api/agreements/:id
 * @desc    Get agreement by ID
 * @access  Authenticated
 */
router.get(
  '/:id',
  authenticate,
  controller.getAgreementById
);

// ============================================================
// UNIVERSITY & COMPANY ROUTES
// ============================================================

/**
 * @route   POST /api/agreements
 * @desc    Create agreement (University or Company)
 * @access  University, Company
 */
router.post(
  '/',
  authenticate,
  authorize('UNIVERSITY', 'COMPANY'),
  validate(createAgreementSchema),
  controller.createAgreement
);

/**
 * @route   GET /api/agreements/me/list
 * @desc    Get my agreements
 * @access  University, Company
 */
router.get(
  '/me/list',
  authenticate,
  authorize('UNIVERSITY', 'COMPANY'),
  controller.getMyAgreements
);

/**
 * @route   PATCH /api/agreements/:id/status
 * @desc    Update agreement status
 * @access  University, Company (involved in the agreement)
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('UNIVERSITY', 'COMPANY'),
  validate(updateAgreementStatusSchema),
  controller.updateAgreementStatus
);

/**
 * @route   DELETE /api/agreements/:id
 * @desc    Delete agreement
 * @access  University, Company (involved in the agreement)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('UNIVERSITY', 'COMPANY'),
  controller.deleteAgreement
);

export default router;
