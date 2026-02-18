import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import offersRoutes from '../modules/offers/offers.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount module routes
router.use('/auth', authRoutes);
router.use('/offers', offersRoutes);

// Not found handler
router.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default router;
