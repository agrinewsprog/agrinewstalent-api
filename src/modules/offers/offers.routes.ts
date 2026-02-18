import { Router } from 'express';
import { OffersController } from './offers.controller';
import { ApplicationsController } from '../applications/applications.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import { createOfferSchema, updateOfferSchema, getOffersSchema } from './offers.dto';
import { applyToOfferSchema } from '../applications/applications.dto';
import { Role } from '@prisma/client';

const router = Router();
const offersController = new OffersController();
const applicationsController = new ApplicationsController();

/**
 * @route   GET /offers
 * @desc    Get all offers with filters and pagination
 * @access  Public
 */
router.get('/', validate(getOffersSchema), offersController.getAll);

/**
 * @route   GET /offers/:id
 * @desc    Get offer by ID
 * @access  Public
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
  authorize(Role.COMPANY),
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
  authorize(Role.COMPANY),
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
  authorize(Role.COMPANY),
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
  authorize(Role.COMPANY),
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
  authorize(Role.COMPANY),
  offersController.close
);

/**
 * @route   POST /offers/:id/apply
 * @desc    Apply to job offer
 * @access  Private - STUDENT only
 */
router.post(
  '/:id/apply',
  authenticate,
  authorize(Role.STUDENT),
  validate(applyToOfferSchema),
  async (req, res, next) => {
    // Remap :id to :offerId for ApplicationsController
    req.params.offerId = req.params.id;
    return applicationsController.applyToOffer(req, res, next);
  }
);

/**
 * @route   POST /offers/:id/save
 * @desc    Save offer for later
 * @access  Private - STUDENT only
 */
router.post(
  '/:id/save',
  authenticate,
  authorize(Role.STUDENT),
  offersController.save
);

/**
 * @route   DELETE /offers/:id/save
 * @desc    Unsave offer
 * @access  Private - STUDENT only
 */
router.delete(
  '/:id/save',
  authenticate,
  authorize(Role.STUDENT),
  offersController.unsave
);

/**
 * @route   GET /offers/saved/me
 * @desc    Get saved offers for current student
 * @access  Private - STUDENT only
 */
router.get(
  '/saved/me',
  authenticate,
  authorize(Role.STUDENT),
  offersController.getSaved
);

export default router;
