import { Router } from 'express';
import { UniversitiesController } from './universities.controller';
import { ProgramsController } from '../programs/programs.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import { uploadUniversityLogo } from '../../common/middlewares/upload.middleware';
import {
  createInviteSchema,
  redeemInviteSchema,
  getStudentsSchema,
  updateUniversityProfileSchema,
} from './universities.dto';
import {
  createProgramSchema,
  updateProgramSchema,
  getProgramsSchema,
  getProgramApplicationsSchema,
  updateCompanyStatusSchema,
  updateOfferStatusSchema,
} from '../programs/programs.dto';

const router = Router();
const universitiesController = new UniversitiesController();
const programsController = new ProgramsController();

// ── Profile ──────────────────────────────────────────────────────────
router.get(
  '/me/profile',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getMyProfile,
);

router.patch(
  '/me/profile',
  authenticate,
  authorize('UNIVERSITY'),
  validate(updateUniversityProfileSchema, 'all'),
  universitiesController.updateMyProfile,
);

// ── Logo upload ───────────────────────────────────────────────────────
router.post(
  '/me/logo',
  authenticate,
  authorize('UNIVERSITY'),
  uploadUniversityLogo.single('logo'),
  universitiesController.uploadLogo,
);

// ── Pending offers (aggregated across all programs) ───────────────────
router.get(
  '/me/pending-offers',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getPendingOffers,
);

// ── Dashboard ─────────────────────────────────────────────────────────
router.get(
  '/me/dashboard',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getMyDashboard,
);

// ── Invites ───────────────────────────────────────────────────────────
router.post(
  '/me/invites',
  authenticate,
  authorize('UNIVERSITY'),
  validate(createInviteSchema, 'all'),
  universitiesController.createInvite,
);

router.get(
  '/me/invites',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getMyInvites,
);

router.delete(
  '/me/invites/:inviteId',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.deleteInvite,
);

router.post(
  '/invites/redeem',
  authenticate,
  authorize('STUDENT'),
  validate(redeemInviteSchema, 'all'),
  universitiesController.redeemInvite,
);

// ── Students ──────────────────────────────────────────────────────────
router.get(
  '/me/students',
  authenticate,
  authorize('UNIVERSITY'),
  validate(getStudentsSchema, 'all'),
  universitiesController.getMyStudents,
);

router.get(
  '/me/students/:studentId',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getStudentDetail,
);

// ── Stats (mantener por compatibilidad) ───────────────────────────────
router.get(
  '/me/stats',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getMyStats,
);

// ── Company profile (informational view from university intranet) ─────
router.get(
  '/me/companies/:companyId',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getCompanyProfile,
);

// ── Programs ──────────────────────────────────────────────────────────
router.post(
  '/me/programs',
  authenticate,
  authorize('UNIVERSITY'),
  validate(createProgramSchema, 'all'),
  programsController.createProgram,
);

router.get(
  '/me/programs',
  authenticate,
  authorize('UNIVERSITY'),
  validate(getProgramsSchema, 'all'),
  programsController.getMyPrograms,
);

router.get(
  '/me/programs/:programId',
  authenticate,
  authorize('UNIVERSITY'),
  programsController.getMyProgramById,
);

router.patch(
  '/me/programs/:programId',
  authenticate,
  authorize('UNIVERSITY'),
  validate(updateProgramSchema, 'all'),
  programsController.updateProgram,
);

router.delete(
  '/me/programs/:programId',
  authenticate,
  authorize('UNIVERSITY'),
  programsController.deleteProgram,
);

router.get(
  '/me/programs/:programId/companies',
  authenticate,
  authorize('UNIVERSITY'),
  programsController.getMyProgramCompanies,
);

router.get(
  '/me/programs/:programId/companies/:companyId',
  authenticate,
  authorize('UNIVERSITY'),
  programsController.getMyProgramCompanyDetail,
);

router.patch(
  '/me/programs/:programId/companies/:companyId/status',
  authenticate,
  authorize('UNIVERSITY'),
  validate(updateCompanyStatusSchema, 'all'),
  programsController.updateMyProgramCompanyStatus,
);

router.get(
  '/me/programs/:programId/applications',
  authenticate,
  authorize('UNIVERSITY'),
  validate(getProgramApplicationsSchema, 'all'),
  programsController.getMyProgramApplications,
);

// ── Program Offers (university management) ────────────────────────
router.get(
  '/me/programs/:programId/offers',
  authenticate,
  authorize('UNIVERSITY'),
  programsController.getUniversityProgramOffers,
);

router.get(
  '/me/programs/:programId/offers/:programOfferId',
  authenticate,
  authorize('UNIVERSITY'),
  programsController.getUniversityProgramOfferDetail,
);

router.patch(
  '/me/programs/:programId/offers/:programOfferId/status',
  authenticate,
  authorize('UNIVERSITY'),
  validate(updateOfferStatusSchema, 'all'),
  programsController.updateOfferStatus,
);

export default router;

