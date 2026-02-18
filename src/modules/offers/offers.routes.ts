import { Router } from 'express';
import { OffersController } from './offers.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import { createOfferSchema, updateOfferSchema } from './offers.dto';
import { UserRole } from '@prisma/client';

const router = Router();
const offersController = new OffersController();

/**
 * @route   GET /offers
 * @desc    Get all published offers
 * @access  Public/Private
 */
router.get('/', offersController.getAll);

/**
 * @route   GET /offers/:id
 * @desc    Get offer by ID
 * @access  Public/Private
 */
router.get('/:id', offersController.getById);

/**
 * @route   POST /offers
 * @desc    Create new offer
 * @access  Private - COMPANY only
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.COMPANY),
  validate(createOfferSchema),
  offersController.create
);

/**
 * @route   PUT /offers/:id
 * @desc    Update offer
 * @access  Private - COMPANY only
 */
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.COMPANY),
  validate(updateOfferSchema),
  offersController.update
);

/**
 * @route   DELETE /offers/:id
 * @desc    Delete offer
 * @access  Private - COMPANY only
 */
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.COMPANY),
  offersController.delete
);

/**
 * @route   POST /offers/:id/publish
 * @desc    Publish offer
 * @access  Private - COMPANY only
 */
router.post(
  '/:id/publish',
  authenticate,
  authorize(UserRole.COMPANY),
  offersController.publish
);

/**
 * @route   POST /offers/:id/close
 * @desc    Close offer
 * @access  Private - COMPANY only
 */
router.post(
  '/:id/close',
  authenticate,
  authorize(UserRole.COMPANY),
  offersController.close
);

export default router;
