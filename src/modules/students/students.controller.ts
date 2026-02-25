import { Request, Response, NextFunction } from 'express';
import { StudentsService } from './students.service';

export class StudentsController {
  private service: StudentsService;

  constructor() {
    this.service = new StudentsService();
  }

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await this.service.getFullProfile(req.user!.userId);
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  };

  replaceEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const education = req.body?.education ?? [];
      const result = await this.service.replaceEducation(req.user!.userId, education);
      res.status(200).json({ message: 'Educación actualizada', education: result });
    } catch (error) {
      next(error);
    }
  };

  replaceExperience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const experience = req.body?.experience ?? [];
      const result = await this.service.replaceExperience(req.user!.userId, experience);
      res.status(200).json({ message: 'Experiencia actualizada', experience: result });
    } catch (error) {
      next(error);
    }
  };

  replaceLanguages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const languages = req.body?.languages ?? [];
      const result = await this.service.replaceLanguages(req.user!.userId, languages);
      res.status(200).json({ message: 'Idiomas actualizados', languages: result });
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
        return;
      }
      const avatarUrl = await this.service.updateAvatar(req.user!.userId, req.file.path);
      res.status(200).json({ message: 'Foto actualizada', avatarUrl });
    } catch (error) {
      next(error);
    }
  };

  uploadResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No se proporcionó ningún archivo' });
        return;
      }
      const result = await this.service.updateResume(req.user!.userId, req.file.path, req.file.originalname);
      res.status(200).json({ message: 'CV actualizado', ...result });
    } catch (error) {
      next(error);
    }
  };

  deleteResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteResume(req.user!.userId);
      res.status(200).json({ message: 'CV eliminado' });
    } catch (error) {
      next(error);
    }
  };
}
