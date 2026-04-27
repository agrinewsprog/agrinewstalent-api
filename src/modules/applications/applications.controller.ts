import { Request, Response, NextFunction } from 'express';
import { ApplicationsService } from './applications.service';
import { GetApplicationsDto } from './applications.dto';

function sendApplicationsError(
  res: Response,
  status: number,
  message: string,
  code: string,
  details?: unknown,
): void {
  const body: Record<string, unknown> = { error: { message, code } };
  if (details !== undefined) {
    (body.error as Record<string, unknown>).details = details;
  }
  res.status(status).json(body);
}

function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export class ApplicationsController {
  private applicationsService: ApplicationsService;

  constructor() {
    this.applicationsService = new ApplicationsService();
  }

  applyToOffer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendApplicationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const offerId = parsePositiveInt(req.params.offerId);
      if (!offerId) {
        sendApplicationsError(res, 400, 'Invalid offer ID', 'INVALID_ID');
        return;
      }

      const studentId = await this.applicationsService.getStudentIdFromUserId(req.user.userId);
      const application = await this.applicationsService.applyToOffer(studentId, offerId, req.body);

      res.status(201).json({
        message: 'Application created successfully',
        application,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Offer not found') {
          sendApplicationsError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message === 'Already applied to this offer') {
          sendApplicationsError(res, 409, error.message, 'APPLICATION_ALREADY_EXISTS');
          return;
        }
        sendApplicationsError(res, 400, error.message, 'APPLICATION_CREATE_ERROR');
        return;
      }
      next(error);
    }
  };

  applyFromBody = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendApplicationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const offerId = parsePositiveInt(req.body.offerId);
      if (!offerId) {
        sendApplicationsError(res, 400, 'offerId is required', 'INVALID_ID');
        return;
      }

      const studentId = await this.applicationsService.getStudentIdFromUserId(req.user.userId);
      const application = await this.applicationsService.applyToOffer(studentId, offerId, {
        coverLetter: req.body.coverLetter,
        resumeUrl: req.body.resumeUrl,
      });

      res.status(201).json({
        message: 'Application created successfully',
        application,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Offer not found') {
          sendApplicationsError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message === 'Already applied to this offer') {
          sendApplicationsError(res, 409, error.message, 'APPLICATION_ALREADY_EXISTS');
          return;
        }
        sendApplicationsError(res, 400, error.message, 'APPLICATION_CREATE_ERROR');
        return;
      }
      next(error);
    }
  };

  getStudentApplications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendApplicationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const studentId = await this.applicationsService.getStudentIdFromUserId(req.user.userId);
      const filters = req.query as unknown as GetApplicationsDto;
      const result = await this.applicationsService.getCanonicalStudentApplications(studentId, filters);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        sendApplicationsError(res, 400, error.message, 'STUDENT_APPLICATIONS_ERROR');
        return;
      }
      next(error);
    }
  };

  getCompanyApplications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendApplicationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const companyId = await this.applicationsService.getCompanyIdFromUserId(req.user.userId);
      const filters = req.query as unknown as GetApplicationsDto;
      const result = await this.applicationsService.getCompanyApplications(companyId, filters);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        sendApplicationsError(res, 400, error.message, 'COMPANY_APPLICATIONS_ERROR');
        return;
      }
      next(error);
    }
  };

  updateStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendApplicationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const applicationId = parsePositiveInt(req.params.id);
      if (!applicationId) {
        sendApplicationsError(res, 400, 'Invalid application ID', 'INVALID_ID');
        return;
      }

      const companyId = await this.applicationsService.getCompanyIdFromUserId(req.user.userId);
      const application = await this.applicationsService.updateApplicationStatus(
        applicationId,
        companyId,
        req.body,
      );

      res.status(200).json({
        message: 'Application status updated successfully',
        application,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          sendApplicationsError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendApplicationsError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        if (error.message.includes('Invalid status')) {
          sendApplicationsError(res, 422, error.message, 'INVALID_STATUS');
          return;
        }
        sendApplicationsError(res, 400, error.message, 'APPLICATION_STATUS_ERROR');
        return;
      }
      next(error);
    }
  };

  addNote = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendApplicationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const applicationId = parsePositiveInt(req.params.id);
      if (!applicationId) {
        sendApplicationsError(res, 400, 'Invalid application ID', 'INVALID_ID');
        return;
      }

      const companyId = await this.applicationsService.getCompanyIdFromUserId(req.user.userId);
      const note = await this.applicationsService.addNote(applicationId, companyId, req.body);

      res.status(201).json({
        message: 'Note added successfully',
        note,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          sendApplicationsError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendApplicationsError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendApplicationsError(res, 400, error.message, 'NOTE_CREATE_ERROR');
        return;
      }
      next(error);
    }
  };

  getTimeline = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendApplicationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const applicationId = parsePositiveInt(req.params.id);
      if (!applicationId) {
        sendApplicationsError(res, 400, 'Invalid application ID', 'INVALID_ID');
        return;
      }

      const timeline = await this.applicationsService.getTimeline(
        applicationId,
        req.user.userId,
        req.user.role,
      );

      res.status(200).json({ timeline });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          sendApplicationsError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendApplicationsError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendApplicationsError(res, 400, error.message, 'TIMELINE_FETCH_ERROR');
        return;
      }
      next(error);
    }
  };

  getNotes = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendApplicationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const applicationId = parsePositiveInt(req.params.id);
      if (!applicationId) {
        sendApplicationsError(res, 400, 'Invalid application ID', 'INVALID_ID');
        return;
      }

      const companyId = await this.applicationsService.getCompanyIdFromUserId(req.user.userId);
      const notes = await this.applicationsService.getNotes(applicationId, companyId);

      res.status(200).json({ notes });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          sendApplicationsError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendApplicationsError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendApplicationsError(res, 400, error.message, 'NOTES_FETCH_ERROR');
        return;
      }
      next(error);
    }
  };
}
