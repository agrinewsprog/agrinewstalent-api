import { Router } from 'express';
import { ProgramsController } from './programs.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import {
  createProgramSchema,
  showInterestSchema,
  updateCompanyStatusSchema,
  createProgramOfferSchema,
  updateOfferStatusSchema,
  applyToProgramOfferSchema,
  getProgramsSchema,
  getProgramApplicationsSchema,
} from './programs.dto';

const router = Router();
const programsController = new ProgramsController();

// ================== UNIVERSITY ENDPOINTS ==================

// Create program (UNIVERSITY only)
router.post(
  '/universities/me/programs',
  authenticate,
  authorize('UNIVERSITY'),
  validate(createProgramSchema, 'all'),
  programsController.createProgram
);

// Get my programs (UNIVERSITY only)
router.get(
  '/universities/me/programs',
  authenticate,
  authorize('UNIVERSITY'),
  validate(getProgramsSchema, 'all'),
  programsController.getMyPrograms
);

// Update company status in program (UNIVERSITY only)
router.patch(
  '/:id/companies/:companyId/status',
  authenticate,
  authorize('UNIVERSITY'),
  validate(updateCompanyStatusSchema, 'all'),
  programsController.updateCompanyStatus
);

// Update offer status (UNIVERSITY only)
router.patch(
  '/:id/offers/:offerId/status',
  authenticate,
  authorize('UNIVERSITY'),
  validate(updateOfferStatusSchema, 'all'),
  programsController.updateOfferStatus
);

// ================== COMPANY ENDPOINTS ==================

// Show interest in program (COMPANY only)
router.post(
  '/:id/interest',
  authenticate,
  authorize('COMPANY'),
  validate(showInterestSchema, 'all'),
  programsController.showInterest
);

// Create offer in program (COMPANY only)
router.post(
  '/:id/offers',
  authenticate,
  authorize('COMPANY'),
  validate(createProgramOfferSchema, 'all'),
  programsController.createOffer
);

// Get my program offers (COMPANY only)
router.get(
  '/companies/me/offers',
  authenticate,
  authorize('COMPANY'),
  programsController.getMyProgramOffers
);

// Get applications for an offer (COMPANY only)
router.get(
  '/offers/:offerId/applications',
  authenticate,
  authorize('COMPANY'),
  programsController.getOfferApplications
);

// ================== STUDENT ENDPOINTS ==================

// Apply to program offer (STUDENT only)
router.post(
  '/:id/offers/:offerId/apply',
  authenticate,
  authorize('STUDENT'),
  validate(applyToProgramOfferSchema, 'all'),
  programsController.applyToOffer
);

// Get my program applications (STUDENT only)
router.get(
  '/students/me/applications',
  authenticate,
  authorize('STUDENT'),
  validate(getProgramApplicationsSchema, 'all'),
  programsController.getMyApplications
);

// ================== PUBLIC/SHARED ENDPOINTS ==================

// Get program details (authenticated)
router.get(
  '/:id',
  authenticate,
  programsController.getProgramById
);

// Get program companies (authenticated)
router.get(
  '/:id/companies',
  authenticate,
  programsController.getProgramCompanies
);

// Get program offers (authenticated)
router.get(
  '/:id/offers',
  authenticate,
  programsController.getProgramOffers
);

export default router;
