import { Router } from 'express';
import { SavedOffersController } from './saved-offers.controller';
import { authenticate, authorize } from '../../common/middlewares';
import { Role } from '@prisma/client';

const router = Router();
const savedOffersController = new SavedOffersController();

// Guardar oferta
router.post(
  '/',
  authenticate,
  authorize(Role.STUDENT),
  savedOffersController.saveOffer
);

// Eliminar oferta guardada
router.delete(
  '/:offerId',
  authenticate,
  authorize(Role.STUDENT),
  savedOffersController.unsaveOffer
);

// Obtener ofertas guardadas
router.get(
  '/',
  authenticate,
  authorize(Role.STUDENT),
  savedOffersController.getSavedOffers
);

export default router;
