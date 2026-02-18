import { Router } from 'express';
import { CompaniesController } from './companies.controller';
import { authenticate, authorize } from '../../common/middlewares';

const router = Router();
const companiesController = new CompaniesController();

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

export default router;
