import { Router } from 'express';
import { ApplicationsController } from './applications.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import {
  applyToOfferSchema,
  updateApplicationStatusSchema,
  createNoteSchema,
  getApplicationsSchema,
} from './applications.dto';
import { Role } from '@prisma/client';

const router = Router();
const applicationsController = new ApplicationsController();

// Aplicar a una oferta desde el body: POST /api/applications { offerId, ... }
router.post(
  '/',
  authenticate,
  authorize(Role.STUDENT),
  applicationsController.applyFromBody
);

// Aplicar a una oferta (solo estudiantes)
router.post(
  '/offers/:offerId/apply',
  authenticate,
  authorize(Role.STUDENT),
  validate(applyToOfferSchema, 'all'),
  applicationsController.applyToOffer
);

// Ver mis postulaciones (solo estudiantes)
router.get(
  '/students/me',
  authenticate,
  authorize(Role.STUDENT),
  validate(getApplicationsSchema, 'all'),
  applicationsController.getStudentApplications
);

// Ver postulaciones a mis ofertas (solo empresas)
router.get(
  '/companies/me',
  authenticate,
  authorize(Role.COMPANY),
  validate(getApplicationsSchema, 'all'),
  applicationsController.getCompanyApplications
);

// Actualizar estado de postulación (solo empresas)
router.patch(
  '/:id/status',
  authenticate,
  authorize(Role.COMPANY),
  validate(updateApplicationStatusSchema, 'all'),
  applicationsController.updateStatus
);

// Agregar nota a postulación (solo empresas)
router.post(
  '/:id/notes',
  authenticate,
  authorize(Role.COMPANY),
  validate(createNoteSchema, 'all'),
  applicationsController.addNote
);

// Ver timeline de una postulación (estudiante o empresa)
router.get(
  '/:id/timeline',
  authenticate,
  authorize(Role.STUDENT, Role.COMPANY),
  applicationsController.getTimeline
);

// Ver notas de una postulación (solo empresas)
router.get(
  '/:id/notes',
  authenticate,
  authorize(Role.COMPANY),
  applicationsController.getNotes
);

export default router;
