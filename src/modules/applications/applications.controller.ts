import { Request, Response, NextFunction } from 'express';
import { ApplicationsService } from './applications.service';
import { GetApplicationsDto } from './applications.dto';

export class ApplicationsController {
  private applicationsService: ApplicationsService;

  constructor() {
    this.applicationsService = new ApplicationsService();
  }

  applyToOffer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const offerId = parseInt(String(req.params.offerId), 10);
      const studentId = await this.applicationsService.getStudentIdFromUserId(
        req.user.userId
      );

      const application = await this.applicationsService.applyToOffer(
        studentId,
        offerId,
        req.body
      );

      res.status(201).json({
        message: 'Application submitted successfully',
        application,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  // POST /api/applications  { offerId, coverLetter?, resumeUrl? }
  applyFromBody = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const offerId = parseInt(String(req.body.offerId), 10);
      if (!offerId || isNaN(offerId)) {
        res.status(400).json({ error: 'offerId is required' });
        return;
      }

      const studentId = await this.applicationsService.getStudentIdFromUserId(
        req.user.userId
      );

      const application = await this.applicationsService.applyToOffer(
        studentId,
        offerId,
        { coverLetter: req.body.coverLetter, resumeUrl: req.body.resumeUrl }
      );

      res.status(201).json({
        message: 'Application submitted successfully',
        application,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getStudentApplications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const studentId = await this.applicationsService.getStudentIdFromUserId(
        req.user.userId
      );

      const filters = req.query as unknown as GetApplicationsDto;
      const result = await this.applicationsService.getStudentApplications(
        studentId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getCompanyApplications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const companyId = await this.applicationsService.getCompanyIdFromUserId(
        req.user.userId
      );

      const filters = req.query as unknown as GetApplicationsDto;
      const result = await this.applicationsService.getCompanyApplications(
        companyId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const applicationId = parseInt(String(req.params.id), 10);
      const companyId = await this.applicationsService.getCompanyIdFromUserId(
        req.user.userId
      );

      const application = await this.applicationsService.updateApplicationStatus(
        applicationId,
        companyId,
        req.body
      );

      res.status(200).json({
        message: 'Application status updated successfully',
        application,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  addNote = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const applicationId = parseInt(String(req.params.id), 10);
      const companyId = await this.applicationsService.getCompanyIdFromUserId(
        req.user.userId
      );

      const note = await this.applicationsService.addNote(
        applicationId,
        companyId,
        req.body
      );

      res.status(201).json({
        message: 'Note added successfully',
        note,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getTimeline = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const applicationId = parseInt(String(req.params.id), 10);

      const timeline = await this.applicationsService.getTimeline(
        applicationId,
        req.user.userId,
        req.user.role
      );

      res.status(200).json({ timeline });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getNotes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const applicationId = parseInt(String(req.params.id), 10);
      const companyId = await this.applicationsService.getCompanyIdFromUserId(
        req.user.userId
      );

      const notes = await this.applicationsService.getNotes(
        applicationId,
        companyId
      );

      res.status(200).json({ notes });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };
}
