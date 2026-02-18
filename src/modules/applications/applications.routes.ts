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

// Aplicar a una oferta (solo estudiantes)
router.post(
  '/offers/:offerId/apply',
  authenticate,
  authorize(Role.STUDENT),
  validate(applyToOfferSchema),
  applicationsController.applyToOffer
);

// Ver mis postulaciones (solo estudiantes)
router.get(
  '/students/me',
  authenticate,
  authorize(Role.STUDENT),
  validate(getApplicationsSchema, 'query'),
  applicationsController.getStudentApplications
);

// Ver postulaciones a mis ofertas (solo empresas)
router.get(
  '/companies/me',
  authenticate,
  authorize(Role.COMPANY),
  validate(getApplicationsSchema, 'query'),
  applicationsController.getCompanyApplications
);

// Actualizar estado de postulación (solo empresas)
router.patch(
  '/:id/status',
  authenticate,
  authorize(Role.COMPANY),
  validate(updateApplicationStatusSchema),
  applicationsController.updateStatus
);

// Agregar nota a postulación (solo empresas)
router.post(
  '/:id/notes',
  authenticate,
  authorize(Role.COMPANY),
  validate(createNoteSchema),
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
