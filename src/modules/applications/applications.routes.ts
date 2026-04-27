import { Router, Response } from 'express';
import { ApplicationsController } from './applications.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import {
  applyToOfferSchema,
  applyToOfferFromBodySchema,
  updateApplicationStatusSchema,
  createNoteSchema,
  getApplicationsSchema,
} from './applications.dto';
import { Role } from '@prisma/client';

const router = Router();
const applicationsController = new ApplicationsController();

function setDeprecatedApplyHeaders(res: Response, canonicalEndpoint: string): void {
  res.setHeader('Deprecation', 'true');
  res.setHeader('X-Canonical-Endpoint', canonicalEndpoint);
}

// Aplicar a una oferta desde el body: POST /api/applications { offerId, ... }
router.post(
  '/',
  authenticate,
  authorize(Role.STUDENT),
  validate(applyToOfferFromBodySchema, 'all'),
  (req, res, next) => {
    setDeprecatedApplyHeaders(res, '/api/applications/offers/:offerId/apply');
    return applicationsController.applyFromBody(req, res, next);
  }
);

// Aplicar a una oferta (solo estudiantes)
router.post(
  '/offers/:offerId/apply',
  authenticate,
  authorize(Role.STUDENT),
  validate(applyToOfferSchema, 'all'),
  (req, res, next) => {
    res.setHeader('X-Canonical-Endpoint', '/api/applications/offers/:offerId/apply');
    return applicationsController.applyToOffer(req, res, next);
  }
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
  (req, res, next) => {
    setDeprecatedApplyHeaders(res, '/api/companies/me/applications/:applicationId/status');
    return applicationsController.updateStatus(req, res, next);
  }
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
