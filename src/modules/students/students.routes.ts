import { Router } from 'express';
import { StudentsController } from './students.controller';
import { authenticate, authorize, validate } from '../../common/middlewares';
import { uploadAvatar, uploadResume } from '../../common/middlewares/upload.middleware';
import { redeemInviteSchema } from './students.dto';
import { Role } from '@prisma/client';

const router = Router();
const studentsController = new StudentsController();

// Obtener perfil completo (con educación, experiencia, idiomas)
router.get(
  '/profile',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getProfile
);

// Reemplazar educación
router.put(
  '/profile/education',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.replaceEducation
);

// Reemplazar experiencia
router.put(
  '/profile/experience',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.replaceExperience
);

// Reemplazar idiomas
router.put(
  '/profile/languages',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.replaceLanguages
);

// Subir foto de perfil
router.post(
  '/profile/photo',
  authenticate,
  authorize(Role.STUDENT),
  uploadAvatar.single('photo'),
  studentsController.uploadAvatar
);

// Subir CV (PDF)
router.post(
  '/profile/cv',
  authenticate,
  authorize(Role.STUDENT),
  uploadResume.single('cv'),
  studentsController.uploadResume
);

// Eliminar CV
router.delete(
  '/profile/cv',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.deleteResume
);

// ── University Membership ─────────────────────────────────────────

// Dashboard del estudiante
router.get(
  '/me/dashboard',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getDashboard,
);

// Canjear código de invitación de universidad
router.post(
  '/me/university/redeem-invite',
  authenticate,
  authorize(Role.STUDENT),
  validate(redeemInviteSchema, 'all'),
  studentsController.redeemInvite,
);

// Obtener mi universidad vinculada
router.get(
  '/me/university',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getMyUniversity,
);

// ── Programs ──────────────────────────────────────────────────────

// Listar programas activos de mi universidad (contadores solo APPROVED)
router.get(
  '/me/programs',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getMyPrograms,
);

// Detalle de programa
router.get(
  '/me/programs/:programId',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getMyProgramDetail,
);

// Inscribirse en un programa
router.post(
  '/me/programs/:programId/enroll',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.enrollInProgram,
);

// Ofertas APPROVED de un programa
router.get(
  '/me/programs/:programId/offers',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getMyProgramOffers,
);

// Detalle de una oferta APPROVED
router.get(
  '/me/programs/:programId/offers/:programOfferId',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getMyProgramOfferDetail,
);

// Aplicar a una oferta APPROVED
router.post(
  '/me/programs/:programId/offers/:programOfferId/apply',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.applyToOffer,
);

// Empresas con ofertas APPROVED en un programa
router.get(
  '/me/programs/:programId/companies',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getMyProgramCompanies,
);

// Detalle de empresa con sus ofertas APPROVED en un programa
router.get(
  '/me/programs/:programId/companies/:companyId',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.getMyProgramCompanyDetail,
);

// ── Offers (shorthand without programId) ──────────────────────────

// Aplicar a una oferta (ruta simplificada sin programId)
router.post(
  '/me/offers/:offerId/apply',
  authenticate,
  authorize(Role.STUDENT),
  studentsController.applyToOfferSimple,
);

export default router;
