import { Router } from 'express';
import { StudentsController } from './students.controller';
import { authenticate, authorize } from '../../common/middlewares';
import { uploadAvatar, uploadResume } from '../../common/middlewares/upload.middleware';
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

export default router;
