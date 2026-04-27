import { Request, Response } from 'express';
import { CompaniesService } from './companies.service';
import {
  deleteProgramOfferSchema,
  listCandidatesSchema,
  updateApplicationStatusSchema,
  updateCompanyProfileSchema,
  updateProgramOfferContentSchema,
} from './companies.dto';
import { prisma } from '../../config/database';

function sendCompanyError(
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

export class CompaniesController {
  private companiesService: CompaniesService;

  constructor() {
    this.companiesService = new CompaniesService();
  }

  // ============================================================
  // GET MY PROFILE
  // ============================================================

  getMyProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const result = await this.companiesService.getMyProfile(req.user.userId);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Company profile not found') {
        res.status(404).json({ error: { message: error.message, code: 'NOT_FOUND' } });
        return;
      }
      res.status(400).json({ error: { message: error.message, code: 'PROFILE_ERROR' } });
    }
  };

  // ============================================================
  // UPDATE MY PROFILE
  // ============================================================

  updateMyProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const parsed = updateCompanyProfileSchema.safeParse(req);

      if (!parsed.success) {
        const details = parsed.error.issues.map((e: any) => ({
          field: e.path.filter((p: any) => p !== 'body').join('.'),
          message: e.message,
          code: e.code,
        }));

        res.status(422).json({ error: { message: 'Validation error', code: 'VALIDATION_ERROR', details } });
        return;
      }

      const result = await this.companiesService.updateMyProfile(req.user.userId, parsed.data.body);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Company profile not found') {
        sendCompanyError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      sendCompanyError(res, 400, error.message, 'PROFILE_UPDATE_ERROR');
    }
  };

  uploadLogo = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      if (!req.file) {
        sendCompanyError(res, 400, 'No file uploaded. Use field name "logo"', 'NO_FILE');
        return;
      }

      const logoUrl = await this.companiesService.uploadLogo(req.user.userId, req.file.path);
      res.status(200).json({ message: 'Logo uploaded successfully', logoUrl });
    } catch (error: any) {
      if (error.message === 'Company profile not found') {
        sendCompanyError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      sendCompanyError(res, 400, error.message, 'LOGO_UPLOAD_FAILED');
    }
  };

  // ============================================================
  // LIST MY CANDIDATES
  // ============================================================

  listMyCandidates = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      if (req.user.role !== 'COMPANY') {
        sendCompanyError(res, 403, 'Only companies can access candidates', 'FORBIDDEN');
        return;
      }

      // Get company profile
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const dto = listCandidatesSchema.parse(req).query;
      const result = await this.companiesService.listMyCandidates(
        companyProfile.id,
        dto
      );

      res.status(200).json(result);
    } catch (error: any) {
      sendCompanyError(res, 400, error.message, 'CANDIDATES_FETCH_ERROR');
    }
  };

  // ============================================================
  // GET CANDIDATE BY ID
  // ============================================================

  getCandidateById = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      if (req.user.role !== 'COMPANY') {
        sendCompanyError(res, 403, 'Only companies can access candidates', 'FORBIDDEN');
        return;
      }

      // Get company profile
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const applicationId = parseInt(req.params.id as string);
      if (isNaN(applicationId) || applicationId <= 0) {
        sendCompanyError(res, 400, 'Invalid application ID', 'INVALID_ID');
        return;
      }
      const result = await this.companiesService.getCandidateById(
        applicationId,
        companyProfile.id
      );

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        sendCompanyError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      sendCompanyError(res, 400, error.message, 'CANDIDATE_DETAIL_ERROR');
    }
  };

  // ============================================================
  // GET CANDIDATE STATISTICS
  // ============================================================

  getMyCandidateStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      if (req.user.role !== 'COMPANY') {
        sendCompanyError(res, 403, 'Only companies can access statistics', 'FORBIDDEN');
        return;
      }

      // Get company profile
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const result = await this.companiesService.getMyCandidateStats(
        companyProfile.id
      );

      res.status(200).json(result);
    } catch (error: any) {
      sendCompanyError(res, 400, error.message, 'CANDIDATE_STATS_ERROR');
    }
  };

  // ============================================================
  // GET DETAIL FOR A SPECIFIC JOB OFFER (normal offers only)
  // ============================================================

  getOfferDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const jobOfferId = parseInt(String(req.params.jobOfferId), 10);
      if (isNaN(jobOfferId) || jobOfferId <= 0) {
        sendCompanyError(res, 400, 'Invalid job offer ID', 'INVALID_ID');
        return;
      }

      const offer = await this.companiesService.getCanonicalOfferDetail(
        companyProfile.id,
        jobOfferId,
      );

      res.status(200).json({ offer });
    } catch (error: any) {
      if (error.message === 'Offer not found') {
        sendCompanyError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      sendCompanyError(res, 400, error.message, 'OFFER_DETAIL_ERROR');
    }
  };

  // ============================================================
  // GET APPLICATIONS FOR A SPECIFIC JOB OFFER (normal offers only)
  // ============================================================

  getOfferApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const offerId = parseInt(String(req.params.offerId), 10);
      if (isNaN(offerId) || offerId <= 0) {
        sendCompanyError(res, 400, 'Invalid job offer ID', 'INVALID_ID');
        return;
      }

      const result = await this.companiesService.getCanonicalOfferApplications(
        companyProfile.id,
        offerId,
      );

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Offer not found') {
        sendCompanyError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      sendCompanyError(res, 400, error.message, 'OFFER_APPLICATIONS_ERROR');
    }
  };

  // ============================================================
  // GET DASHBOARD (combined job + program stats)
  // ============================================================

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const dashboard = await this.companiesService.getCanonicalDashboard(companyProfile.id);

      res.status(200).json({ dashboard });
    } catch (error: any) {
      sendCompanyError(res, 400, error.message, 'DASHBOARD_ERROR');
    }
  };

  // ============================================================
  // GET APPLICATIONS FOR A PROGRAM OFFER (explicit route)
  // ============================================================

  getProgramOfferApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const programId = parseInt(String(req.params.programId), 10);
      const programOfferId = parseInt(String(req.params.programOfferId), 10);

      if (isNaN(programId) || programId <= 0) {
        sendCompanyError(res, 400, 'Invalid program ID', 'INVALID_ID');
        return;
      }
      if (isNaN(programOfferId) || programOfferId <= 0) {
        sendCompanyError(res, 400, 'Invalid program offer ID', 'INVALID_ID');
        return;
      }

      const result = await this.companiesService.getCanonicalProgramOfferApplications(
        companyProfile.id,
        programId,
        programOfferId,
      );

      res.status(200).json(result);
    } catch (error: any) {
      const msg = error.message ?? '';
      if (msg.includes('not found')) {
        sendCompanyError(res, 404, msg, 'NOT_FOUND');
        return;
      }
      if (msg.includes('does not belong')) {
        sendCompanyError(res, 403, msg, 'FORBIDDEN');
        return;
      }
      sendCompanyError(res, 400, msg, 'PROGRAM_APPLICATIONS_ERROR');
    }
  };

  updateProgramOffer = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const parsed = updateProgramOfferContentSchema.safeParse(req);
      if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
          field: issue.path.filter((segment) => segment !== 'body' && segment !== 'params').join('.'),
          message: issue.message,
          code: issue.code,
        }));
        sendCompanyError(res, 422, 'Validation error', 'VALIDATION_ERROR', details);
        return;
      }

      const result = await this.companiesService.updateCanonicalProgramOffer(
        companyProfile.id,
        parsed.data.params.programId,
        parsed.data.params.programOfferId,
        parsed.data.body,
      );

      res.status(200).json(result);
    } catch (error: any) {
      const msg = error.message ?? '';
      if (msg.includes('not found')) {
        sendCompanyError(res, 404, msg, 'NOT_FOUND');
        return;
      }
      if (msg.includes('does not belong')) {
        sendCompanyError(res, 403, msg, 'FORBIDDEN');
        return;
      }
      sendCompanyError(res, 400, msg, 'PROGRAM_OFFER_UPDATE_FAILED');
    }
  };

  deleteProgramOffer = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendCompanyError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const parsed = deleteProgramOfferSchema.safeParse(req);
      if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
          field: issue.path.filter((segment) => segment !== 'params').join('.'),
          message: issue.message,
          code: issue.code,
        }));
        sendCompanyError(res, 422, 'Validation error', 'VALIDATION_ERROR', details);
        return;
      }

      const result = await this.companiesService.deleteCanonicalProgramOffer(
        companyProfile.id,
        parsed.data.params.programId,
        parsed.data.params.programOfferId,
      );

      res.status(200).json(result);
    } catch (error: any) {
      const msg = error.message ?? '';
      if (msg.includes('not found')) {
        sendCompanyError(res, 404, msg, 'NOT_FOUND');
        return;
      }
      if (msg.includes('does not belong')) {
        sendCompanyError(res, 403, msg, 'FORBIDDEN');
        return;
      }
      if (msg.includes('already has applications')) {
        sendCompanyError(res, 409, msg, 'PROGRAM_OFFER_DELETE_CONFLICT');
        return;
      }
      sendCompanyError(res, 400, msg, 'PROGRAM_OFFER_DELETE_FAILED');
    }
  };

  // ============================================================
  // UPDATE APPLICATION STATUS
  // ============================================================

  updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
        return;
      }

      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        sendCompanyError(res, 404, 'Company profile not found', 'NOT_FOUND');
        return;
      }

      const parsed = updateApplicationStatusSchema.safeParse(req);
      if (!parsed.success) {
        const details = parsed.error.issues.map((e: any) => ({
          field: e.path.filter((p: any) => p !== 'body' && p !== 'params').join('.'),
          message: e.message,
          code: e.code,
        }));
        sendCompanyError(res, 422, 'Validation error', 'VALIDATION_ERROR', details);
        return;
      }

      const { status, type } = parsed.data.body;
      const { applicationId } = parsed.data.params;

      if (isNaN(applicationId) || applicationId <= 0) {
        sendCompanyError(res, 400, 'Invalid application ID', 'INVALID_ID');
        return;
      }

      const result = await this.companiesService.updateCanonicalApplicationStatus(
        companyProfile.id,
        applicationId,
        status,
        type,
      );
      const application = result.application as any;

      // Idempotent response: status was already set
      if ((application as any)._idempotent) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            '[DEV:updateApplicationStatus:ctrl:IDEMPOTENT] applicationId=%d source=%s status=%s — already set, returning 200',
            applicationId, application.source, application.status,
          );
        }
        const { _idempotent, ...rest } = application as any;
        res.status(200).json({
          message: 'Application status already set',
          application: rest,
        });
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          '[DEV:updateApplicationStatus:ctrl:RESULT] applicationId=%d source=%s finalSavedStatus=%s previousStatus=%s',
          applicationId, application.source, application.status, application.previousStatus,
        );
      }

      res.status(200).json({
        message: result.message,
        application,
        idempotent: result.idempotent,
      });
    } catch (error: any) {
      const msg = error.message ?? '';

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          '[DEV:updateApplicationStatus:ctrl:ERROR] message="%s"',
          msg,
        );
      }

      if (msg === 'Application not found') {
        sendCompanyError(res, 404, msg, 'NOT_FOUND');
        return;
      }
      if (msg.includes('Invalid status')) {
        sendCompanyError(res, 422, msg, 'INVALID_STATUS');
        return;
      }
      if (msg.includes('Ambiguous application ID')) {
        sendCompanyError(res, 409, msg, 'AMBIGUOUS_APPLICATION_ID');
        return;
      }
      sendCompanyError(res, 400, msg, 'STATUS_UPDATE_ERROR');
    }
  };
}
