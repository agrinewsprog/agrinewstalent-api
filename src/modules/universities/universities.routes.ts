import { Router } from 'express';
import { UniversitiesController } from './universities.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import {
  createInviteSchema,
  redeemInviteSchema,
  getStudentsSchema,
} from './universities.dto';

const router = Router();
const universitiesController = new UniversitiesController();

// Create invite code (only universities)
router.post(
  '/me/invites',
  authenticate,
  authorize('UNIVERSITY'),
  validate(createInviteSchema, 'all'),
  universitiesController.createInvite
);

// Get university invites (only universities)
router.get(
  '/me/invites',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getMyInvites
);

// Redeem invite code (only students)
router.post(
  '/invites/redeem',
  authenticate,
  authorize('STUDENT'),
  validate(redeemInviteSchema, 'all'),
  universitiesController.redeemInvite
);

// Get university students (only universities)
router.get(
  '/me/students',
  authenticate,
  authorize('UNIVERSITY'),
  validate(getStudentsSchema, 'all'),
  universitiesController.getMyStudents
);

// Get university stats (only universities)
router.get(
  '/me/stats',
  authenticate,
  authorize('UNIVERSITY'),
  universitiesController.getMyStats
);

export default router;
