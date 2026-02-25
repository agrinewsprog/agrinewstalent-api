import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes';
import offersRoutes from '../modules/offers/offers.routes';
import applicationsRoutes from '../modules/applications/applications.routes';
import universitiesRoutes from '../modules/universities/universities.routes';
import programsRoutes from '../modules/programs/programs.routes';
import coursesRoutes from '../modules/courses/courses.routes';
import promotionsRoutes from '../modules/promotions/promotions.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import agreementsRoutes from '../modules/agreements/agreements.routes';
import companiesRoutes from '../modules/companies/companies.routes';
import savedOffersRoutes from '../modules/saved-offers/saved-offers.routes';
import studentsRoutes from '../modules/students/students.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount module routes
router.use('/auth', authRoutes);
router.use('/offers', offersRoutes);
router.use('/applications', applicationsRoutes);
router.use('/universities', universitiesRoutes);
router.use('/programs', programsRoutes);
router.use('/courses', coursesRoutes);
router.use('/promotions', promotionsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/agreements', agreementsRoutes);
router.use('/companies', companiesRoutes);
router.use('/saved-offers', savedOffersRoutes);
router.use('/student', studentsRoutes);

export default router;