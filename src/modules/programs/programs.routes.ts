import { Router, Response } from 'express';
import { ProgramsController } from './programs.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import {
  showInterestSchema,
  updateCompanyStatusSchema,
  createProgramOfferSchema,
  updateOfferStatusSchema,
  applyToProgramOfferSchema,
  getProgramApplicationsSchema,
} from './programs.dto';

const router = Router();
const programsController = new ProgramsController();

function setDeprecatedProgramApplyHeaders(res: Response): void {
  res.setHeader('Deprecation', 'true');
  res.setHeader('X-Canonical-Endpoint', '/api/students/me/programs/:programId/offers/:programOfferId/apply');
}

function setDeprecatedProgramCreateHeaders(res: Response): void {
  res.setHeader('Deprecation', 'true');
  res.setHeader('X-Canonical-Endpoint', '/api/companies/me/programs/:programId/offers');
}

// Note: university-specific program CRUD lives in universities.routes.ts

// -- Company status in program (UNIVERSITY) --
router.patch(
  '/:programId/companies/:companyId/status',
  authenticate,
  authorize('UNIVERSITY'),
  validate(updateCompanyStatusSchema, 'all'),
  programsController.updateCompanyStatus,
);

// Update offer status (UNIVERSITY only)
router.patch(
  '/:programId/offers/:programOfferId/status',
  authenticate,
  authorize('UNIVERSITY'),
  validate(updateOfferStatusSchema, 'all'),
  programsController.updateOfferStatus,
);

// -- Company endpoints --

// Show interest in program
router.post(
  '/:id/interest',
  authenticate,
  authorize('COMPANY'),
  validate(showInterestSchema, 'all'),
  programsController.showInterest,
);

// Create offer in program (COMPANY - no ProgramCompany required)
router.post(
  '/:programId/offers',
  authenticate,
  authorize('COMPANY'),
  validate(createProgramOfferSchema, 'all'),
  (req, res, next) => {
    setDeprecatedProgramCreateHeaders(res);
    return programsController.createOffer(req, res, next);
  },
);

// Get my program offers (COMPANY)
router.get(
  '/companies/me/offers',
  authenticate,
  authorize('COMPANY'),
  programsController.getMyProgramOffers,
);

// Get applications for an offer (COMPANY)
router.get(
  '/offers/:offerId/applications',
  authenticate,
  authorize('COMPANY'),
  programsController.getOfferApplications,
);

// -- Student endpoints --

// Apply to program offer
router.post(
  '/:id/offers/:offerId/apply',
  authenticate,
  authorize('STUDENT'),
  validate(applyToProgramOfferSchema, 'all'),
  (req, res, next) => {
    setDeprecatedProgramApplyHeaders(res);
    return programsController.applyToOffer(req, res, next);
  },
);

// Get my program applications (STUDENT)
router.get(
  '/students/me/applications',
  authenticate,
  authorize('STUDENT'),
  validate(getProgramApplicationsSchema, 'all'),
  programsController.getMyApplications,
);

// -- Public/shared --

// Get program detail (role-aware for authenticated users)
router.get('/:id', authenticate, programsController.getProgramDetail);

// Get program companies
router.get('/:id/companies', authenticate, programsController.getProgramCompanies);

// Get program offers
router.get('/:programId/offers', authenticate, programsController.getProgramOffers);

export default router;
