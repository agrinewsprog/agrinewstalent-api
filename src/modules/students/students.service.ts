import { prisma } from '../../config/database';
import fs from 'fs';
import path from 'path';

const PUBLIC_ROOT = path.join(__dirname, '..', '..', '..', 'public');

function deleteFile(relativePath: string | null | undefined) {
  if (!relativePath) return;
  // relativePath looks like /uploads/avatars/avatar-123.jpg
  const abs = path.join(PUBLIC_ROOT, relativePath);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
}

export class StudentsService {
  /** Reemplaza toda la educación del estudiante */
  async replaceEducation(
    userId: number,
    education: {
      degree: string;
      institution: string;
      startDate: string;
      endDate?: string;
      current: boolean;
    }[]
  ) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Perfil no encontrado');

    await prisma.studentEducation.deleteMany({ where: { studentId: profile.id } });

    if (education.length > 0) {
      await prisma.studentEducation.createMany({
        data: education.map(e => ({
          studentId: profile.id,
          degree: e.degree,
          institution: e.institution,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          current: e.current,
        })),
      });
    }

    return prisma.studentEducation.findMany({ where: { studentId: profile.id } });
  }

  /** Reemplaza toda la experiencia del estudiante */
  async replaceExperience(
    userId: number,
    experience: {
      position: string;
      company: string;
      startDate: string;
      endDate?: string;
      current: boolean;
    }[]
  ) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Perfil no encontrado');

    await prisma.studentExperience.deleteMany({ where: { studentId: profile.id } });

    if (experience.length > 0) {
      await prisma.studentExperience.createMany({
        data: experience.map(e => ({
          studentId: profile.id,
          position: e.position,
          company: e.company,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          current: e.current,
        })),
      });
    }

    return prisma.studentExperience.findMany({ where: { studentId: profile.id } });
  }

  /** Reemplaza todos los idiomas del estudiante */
  async replaceLanguages(
    userId: number,
    languages: { language: string; level: string }[]
  ) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Perfil no encontrado');

    await prisma.studentLanguage.deleteMany({ where: { studentId: profile.id } });

    if (languages.length > 0) {
      await prisma.studentLanguage.createMany({
        data: languages.map(l => ({
          studentId: profile.id,
          language: l.language,
          level: l.level,
        })),
      });
    }

    return prisma.studentLanguage.findMany({ where: { studentId: profile.id } });
  }

  /** Obtiene el perfil completo del estudiante con educación, experiencia e idiomas */
  async getFullProfile(userId: number) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        education: { orderBy: { startDate: 'asc' } },
        experience: { orderBy: { startDate: 'asc' } },
        languages: { orderBy: { language: 'asc' } },
      },
    });
    return profile;
  }

  /** Guarda la foto de perfil y elimina la anterior */
  async updateAvatar(userId: number, filePath: string): Promise<string> {
    const relativePath = '/' + filePath.replace(/\\/g, '/').split('public/').pop()!;
    const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { avatarUrl: true } });
    deleteFile(profile?.avatarUrl);
    await prisma.studentProfile.update({ where: { userId }, data: { avatarUrl: relativePath } });
    return relativePath;
  }

  /** Guarda el CV y actualiza resumeUrl, elimina el anterior */
  async updateResume(userId: number, filePath: string, fileName: string): Promise<{ fileUrl: string; fileName: string }> {
    const relativePath = '/' + filePath.replace(/\\/g, '/').split('public/').pop()!;
    const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { resumeUrl: true } });
    deleteFile(profile?.resumeUrl);
    await prisma.studentProfile.update({ where: { userId }, data: { resumeUrl: relativePath } });
    return { fileUrl: relativePath, fileName };
  }

  /** Elimina el CV */
  async deleteResume(userId: number): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { resumeUrl: true } });
    deleteFile(profile?.resumeUrl);
    await prisma.studentProfile.update({ where: { userId }, data: { resumeUrl: null } });
  }
}
