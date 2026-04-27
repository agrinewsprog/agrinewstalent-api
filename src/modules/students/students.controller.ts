import { Request, Response, NextFunction } from 'express';
import { StudentsService } from './students.service';

function sendStudentUploadError(
  res: Response,
  message: string,
  code: string,
): void {
  res.status(400).json({ error: { message, code } });
}

function setDeprecatedRouteHeaders(
  res: Response,
  canonicalEndpoint: string,
): void {
  res.setHeader('Deprecation', 'true');
  res.setHeader('X-Canonical-Endpoint', canonicalEndpoint);
}

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
      res.status(200).json({ message: 'Educacion actualizada', education: result });
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
        sendStudentUploadError(res, 'No image file was provided', 'MISSING_AVATAR_FILE');
        return;
      }

      const avatarUrl = await this.service.updateAvatar(req.user!.userId, req.file.path);
      res.status(200).json({
        message: 'Profile photo updated successfully',
        avatarUrl,
      });
    } catch (error) {
      next(error);
    }
  };

  uploadResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        sendStudentUploadError(res, 'No resume file was provided', 'MISSING_RESUME_FILE');
        return;
      }

      const result = await this.service.updateResume(
        req.user!.userId,
        req.file.path,
        req.file.originalname,
      );

      res.status(200).json({
        message: 'Resume updated successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteResume(req.user!.userId);
      res.status(200).json({ message: 'Resume deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  private sendStudentError(res: Response, error: Error): void {
    const msg = error.message;
    let status = 400;
    let code = 'BAD_REQUEST';

    if (msg.includes('not found')) {
      status = 404;
      code = 'NOT_FOUND';
    } else if (msg.includes('not linked')) {
      status = 403;
      code = 'NO_UNIVERSITY';
    } else if (msg.includes('does not belong')) {
      status = 403;
      code = 'FORBIDDEN';
    } else if (msg.includes('not active')) {
      status = 400;
      code = 'PROGRAM_INACTIVE';
    } else if (msg.includes('Already')) {
      status = 409;
      code = 'APPLICATION_ALREADY_EXISTS';
    } else if (msg.includes('maximum')) {
      status = 400;
      code = 'LIMIT_REACHED';
    } else if (msg.includes('non-approved')) {
      status = 403;
      code = 'FORBIDDEN';
    }

    res.status(status).json({ error: { message: msg, code } });
  }

  redeemInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const university = await this.service.redeemInvite(req.user!.userId, req.body.inviteCode);
      res.status(200).json({ message: 'University linked successfully', university });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ error: { message: error.message, code: 'REDEEM_FAILED' } });
        return;
      }
      next(error);
    }
  };

  getMyUniversity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const university = await this.service.getMyUniversity(req.user!.userId);
      res.status(200).json({ university });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: { message: error.message, code: 'UNIVERSITY_FETCH_FAILED' } });
        return;
      }
      next(error);
    }
  };

  getMyPrograms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getMyPrograms(req.user!.userId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  getMyProgramDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programId = Number(req.params.programId);
      if (isNaN(programId)) {
        res.status(400).json({ error: { message: 'Invalid program ID', code: 'INVALID_PARAM' } });
        return;
      }
      const result = await this.service.getMyProgramDetail(req.user!.userId, programId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  getMyProgramOffers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programId = Number(req.params.programId);
      if (isNaN(programId)) {
        res.status(400).json({ error: { message: 'Invalid program ID', code: 'INVALID_PARAM' } });
        return;
      }
      const result = await this.service.getCanonicalProgramOffers(req.user!.userId, programId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  getMyProgramCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programId = Number(req.params.programId);
      if (isNaN(programId)) {
        res.status(400).json({ error: { message: 'Invalid program ID', code: 'INVALID_PARAM' } });
        return;
      }
      const result = await this.service.getMyProgramCompanies(req.user!.userId, programId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  getMyProgramCompanyDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programId = Number(req.params.programId);
      const companyId = Number(req.params.companyId);
      if (!Number.isFinite(programId) || programId <= 0 || !Number.isFinite(companyId) || companyId <= 0) {
        res.status(400).json({ error: { message: 'Invalid program or company ID', code: 'INVALID_PARAM' } });
        return;
      }
      const result = await this.service.getCanonicalProgramCompanyDetail(req.user!.userId, programId, companyId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  getMyProgramOfferDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programId = Number(req.params.programId);
      const programOfferId = Number(req.params.programOfferId);
      if (!Number.isFinite(programId) || programId <= 0 || !Number.isFinite(programOfferId) || programOfferId <= 0) {
        res.status(400).json({ error: { message: 'Invalid program or offer ID', code: 'INVALID_PARAM' } });
        return;
      }
      const result = await this.service.getCanonicalProgramOfferDetail(req.user!.userId, programId, programOfferId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  enrollInProgram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programId = Number(req.params.programId);
      if (isNaN(programId)) {
        res.status(400).json({ error: { message: 'Invalid program ID', code: 'INVALID_PARAM' } });
        return;
      }
      const enrollment = await this.service.enrollInProgram(req.user!.userId, programId);
      res.status(201).json({ message: 'Enrolled successfully', enrollment });
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  applyToOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programId = Number(req.params.programId);
      const programOfferId = Number(req.params.programOfferId);
      if (!Number.isFinite(programId) || programId <= 0 || !Number.isFinite(programOfferId) || programOfferId <= 0) {
        res.status(400).json({ error: { message: 'Invalid program or offer ID', code: 'INVALID_PARAM' } });
        return;
      }
      const result = await this.service.applyToCanonicalProgramOffer(
        req.user!.userId,
        programId,
        programOfferId,
        { coverLetter: req.body.coverLetter },
      );
      res.status(201).json({
        message: 'Application created successfully',
        ...result,
      });
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  applyToOfferSimple = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offerId = Number(req.params.offerId);
      if (!Number.isFinite(offerId) || offerId <= 0) {
        res.status(400).json({ error: { message: 'Invalid offer ID', code: 'INVALID_PARAM' } });
        return;
      }

      setDeprecatedRouteHeaders(
        res,
        '/api/students/me/programs/:programId/offers/:programOfferId/apply',
      );

      const result = await this.service.applyToOfferSimple(
        req.user!.userId,
        offerId,
        { coverLetter: req.body.coverLetter },
      );

      res.status(201).json({
        message: 'Application created successfully',
        ...result,
      });
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dashboard = await this.service.getCanonicalStudentDashboard(req.user!.userId);
      res.status(200).json({ dashboard });
    } catch (error) {
      if (error instanceof Error) {
        this.sendStudentError(res, error);
        return;
      }
      next(error);
    }
  };
}
