import { Router } from 'express';
import { CompaniesController } from './companies.controller';
import { ProgramsController } from '../programs/programs.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import { uploadCompanyLogo } from '../../common/middlewares/upload.middleware';
import { deleteProgramOfferSchema, updateProgramOfferContentSchema } from './companies.dto';
import { createProgramOfferSchema } from '../programs/programs.dto';

const router = Router();
const companiesController = new CompaniesController();
const programsController = new ProgramsController();

/**
 * @route   GET /companies/me/profile
 * @desc    Get company profile (all fields)
 * @access  Private (COMPANY only)
 */
router.get(
  '/me/profile',
  authenticate,
  authorize('COMPANY'),
  companiesController.getMyProfile
);

/**
 * @route   PATCH /companies/me/profile
 * @desc    Update company profile
 * @access  Private (COMPANY only)
 */
router.patch(
  '/me/profile',
  authenticate,
  authorize('COMPANY'),
  companiesController.updateMyProfile
);

router.post(
  '/me/logo',
  authenticate,
  authorize('COMPANY'),
  uploadCompanyLogo.single('logo'),
  companiesController.uploadLogo
);

/**
 * @route   GET /companies/me/candidates
 * @desc    Get all candidates (applications) for company's job offers
 * @access  Private (COMPANY only)
 * @query   status?, offerId?, search?, page?, limit?
 */
router.get(
  '/me/candidates',
  authenticate,
  authorize('COMPANY'),
  companiesController.listMyCandidates
);

/**
 * @route   GET /companies/candidates/:id
 * @desc    Get candidate details by application ID
 * @access  Private (COMPANY only)
 */
router.get(
  '/candidates/:id',
  authenticate,
  authorize('COMPANY'),
  companiesController.getCandidateById
);

/**
 * @route   GET /companies/me/stats
 * @desc    Get candidate statistics for the company
 * @access  Private (COMPANY only)
 */
router.get(
  '/me/stats',
  authenticate,
  authorize('COMPANY'),
  companiesController.getMyCandidateStats
);

/**
 * @route   GET /companies/me/dashboard
 * @desc    Get combined dashboard (job + program application stats + latest program applications)
 * @access  Private (COMPANY only)
 */
router.get(
  '/me/dashboard',
  authenticate,
  authorize('COMPANY'),
  companiesController.getDashboard
);

/**
 * @route   GET /companies/me/offers/:offerId/applications
 * @desc    Get applications for a specific JobOffer (normal offers only — not program offers)
 * @access  Private (COMPANY only)
 */
router.get(
  '/me/offers/:jobOfferId',
  authenticate,
  authorize('COMPANY'),
  companiesController.getOfferDetail
);

router.get(
  '/me/offers/:offerId/applications',
  authenticate,
  authorize('COMPANY'),
  companiesController.getOfferApplications
);

/**
 * @route   GET /companies/me/programs/:programId/offers/:programOfferId/applications
 * @desc    Get applications for a specific program offer (explicit program context)
 * @access  Private (COMPANY only)
 */
router.get(
  '/me/programs/:programId/offers/:programOfferId/applications',
  authenticate,
  authorize('COMPANY'),
  companiesController.getProgramOfferApplications
);

router.post(
  '/me/programs/:programId/offers',
  authenticate,
  authorize('COMPANY'),
  validate(createProgramOfferSchema, 'all'),
  programsController.createOffer,
);

router.patch(
  '/me/programs/:programId/offers/:programOfferId',
  authenticate,
  authorize('COMPANY'),
  validate(updateProgramOfferContentSchema, 'all'),
  companiesController.updateProgramOffer,
);

router.delete(
  '/me/programs/:programId/offers/:programOfferId',
  authenticate,
  authorize('COMPANY'),
  validate(deleteProgramOfferSchema, 'all'),
  companiesController.deleteProgramOffer,
);

/**
 * @route   PATCH /companies/me/applications/:applicationId/status
 * @desc    Update application status (job or program)
 * @access  Private (COMPANY only)
 */
router.patch(
  '/me/applications/:applicationId/status',
  authenticate,
  authorize('COMPANY'),
  companiesController.updateApplicationStatus
);

/**
 * @route   GET /companies/me/programs
 * @desc    Get active programs visible to company
 * @access  Private (COMPANY only)
 */
router.get(
  '/me/programs',
  authenticate,
  authorize('COMPANY'),
  programsController.getCompanyPrograms,
);

/**
 * @route   GET /companies/me/programs/:programId
 * @desc    Get program detail (company view — active only)
 * @access  Private (COMPANY only)
 */
router.get(
  '/me/programs/:programId',
  authenticate,
  authorize('COMPANY'),
  programsController.getProgramDetail,
);

export default router;
