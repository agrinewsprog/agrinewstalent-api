import { Request, Response, NextFunction } from 'express';
import { ProgramsService } from './programs.service';
import { GetProgramsDto, GetProgramApplicationsDto } from './programs.dto';

// ---------------------------------------------------------------------------
// Helper: formato de error consistente { error: { message, code, details? } }
// ---------------------------------------------------------------------------
function sendError(
  res: Response,
  status: number,
  message: string,
  code: string,
  details?: unknown,
): void {
  const body: Record<string, unknown> = { error: { message, code } };
  if (details !== undefined) (body.error as Record<string, unknown>).details = details;
  res.status(status).json(body);
}

export class ProgramsController {
  private programsService: ProgramsService;

  constructor() {
    this.programsService = new ProgramsService();
  }

  // ── UNIVERSITY: PROGRAM CRUD ───────────────────────────────────────────────

  createProgram = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const program = await this.programsService.createProgram(universityId, req.body);
      res.status(201).json({ message: 'Program created successfully', program });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'PROGRAM_CREATION_FAILED');
        return;
      }
      next(error);
    }
  };

  getMyPrograms = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const filters = req.query as unknown as GetProgramsDto;
      const result = await this.programsService.getUniversityPrograms(universityId, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getMyProgramById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const program = await this.programsService.getCanonicalUniversityProgramDetail(
        programId,
        universityId,
      );
      res.status(200).json({ program });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('not found') ? 404 : 403;
        sendError(res, status, error.message, status === 404 ? 'NOT_FOUND' : 'FORBIDDEN');
        return;
      }
      next(error);
    }
  };

  updateProgram = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const program = await this.programsService.updateProgram(
        programId,
        universityId,
        req.body,
      );
      res.status(200).json({ message: 'Program updated successfully', program });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('not found') ? 404 : 400;
        sendError(res, status, error.message, status === 404 ? 'NOT_FOUND' : 'UPDATE_FAILED');
        return;
      }
      next(error);
    }
  };

  deleteProgram = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      if (isNaN(programId)) { sendError(res, 400, 'Invalid program ID', 'INVALID_ID'); return; }
      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const deletedId = await this.programsService.deleteProgram(programId, universityId);
      res.status(200).json({ message: 'Program deleted successfully', id: deletedId });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        sendError(res, 400, error.message, 'PROGRAM_DELETE_FAILED');
        return;
      }
      next(error);
    }
  };

  getMyProgramCompanies = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      if (isNaN(programId)) { sendError(res, 400, 'Invalid program ID', 'INVALID_ID'); return; }
      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const companies = await this.programsService.getProgramCompanies(
        programId,
        universityId,
      );
      res.status(200).json({ companies: companies ?? [] });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendError(res, 400, error.message, 'COMPANIES_FETCH_FAILED');
        return;
      }
      next(error);
    }
  };

  getMyProgramCompanyDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      const companyId = parseInt(String(req.params.companyId), 10);
      if (isNaN(programId) || isNaN(companyId)) {
        sendError(res, 400, 'Invalid program or company ID', 'INVALID_ID');
        return;
      }
      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const detail = await this.programsService.getProgramCompanyDetail(
        programId,
        companyId,
        universityId,
      );

      const c = detail.company as any;
      const parseJson = (v: string | null | undefined): any[] => {
        if (!v) return [];
        try { return JSON.parse(v); } catch { return []; }
      };
      const location = [c.city, c.country].filter(Boolean).join(', ') || null;

      const companyFormatted = {
        id: c.id,
        companyId: c.id,
        name: c.companyName,
        logoUrl: c.logoUrl ?? null,
        location,
        city: c.city ?? null,
        country: c.country ?? null,
        description: c.description ?? null,
        descriptionLong: c.descriptionLong ?? null,
        industry: c.industry ?? null,
        website: c.website ?? null,
        linkedinUrl: c.linkedinUrl ?? null,
        size: c.companySize ?? c.size ?? null,
        companySize: c.companySize ?? null,
        foundedYear: c.foundedYear ?? null,
        contactPerson: c.contactPerson ?? null,
        contactEmail: c.contactEmail ?? null,
        contactPhone: c.contactPhone ?? null,
        workModes: parseJson(c.workModes),
        vacancyTypes: parseJson(c.vacancyTypes),
        workingLanguages: parseJson(c.workingLanguages),
        participatesInInternships: c.participatesInInternships ?? false,
      };

      res.status(200).json({
        programCompany: {
          id: detail.id,
          programId: detail.programId,
          companyId: detail.companyId,
          status: detail.status,
          requestedAt: detail.requestedAt,
          reviewedAt: (detail as any).reviewedAt ?? null,
          reviewedBy: (detail as any).reviewedBy ?? null,
        },
        company: companyFormatted,
        offers: (detail as any)._offers ?? [],
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendError(res, 400, error.message, 'COMPANY_DETAIL_FAILED');
        return;
      }
      next(error);
    }
  };

  updateMyProgramCompanyStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      const companyId = parseInt(String(req.params.companyId), 10);
      if (isNaN(programId) || isNaN(companyId)) {
        sendError(res, 400, 'Invalid program or company ID', 'INVALID_ID');
        return;
      }
      const updated = await this.programsService.updateCompanyStatus(
        programId,
        companyId,
        req.user.userId,
        req.body,
      );
      res.status(200).json({
        message: 'Company status updated successfully',
        programCompany: updated,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendError(res, 400, error.message, 'STATUS_UPDATE_FAILED');
        return;
      }
      next(error);
    }
  };

  getMyProgramApplications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      if (isNaN(programId) || programId <= 0) {
        sendError(res, 400, 'Invalid program ID', 'INVALID_PARAM');
        return;
      }
      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const filters = req.query as unknown as GetProgramApplicationsDto;

      const result = await this.programsService.getProgramApplicationsForUniversity(
        programId,
        universityId,
        filters,
      );
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('not found')) { sendError(res, 404, msg, 'NOT_FOUND'); return; }
        if (msg.includes('Unauthorized')) { sendError(res, 403, msg, 'FORBIDDEN'); return; }
        sendError(res, 400, msg, 'APPLICATIONS_FETCH_FAILED');
        return;
      }
      next(error);
    }
  };

  // ── COMPANY: list active programs ──────────────────────────────────────────

  getCompanyPrograms = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const filters = req.query as unknown as GetProgramsDto;
      const result = await this.programsService.getActiveProgramsForCompany(filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ── STUDENT: list programs of my university ────────────────────────────────

  getStudentPrograms = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const filters = req.query as unknown as GetProgramsDto;
      const result = await this.programsService.getActiveProgramsForStudent(
        req.user.userId,
        filters,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ── ROLE-AWARE: program detail ─────────────────────────────────────────────

  getProgramDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId ?? req.params.id), 10);
      if (isNaN(programId)) { sendError(res, 400, 'Invalid program ID', 'INVALID_ID'); return; }
      const program = await this.programsService.getProgramDetailForRole(
        programId,
        req.user.role,
        req.user.userId,
      );
      res.status(200).json({ program });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        sendError(res, 403, error.message, 'FORBIDDEN');
        return;
      }
      next(error);
    }
  };

  // ── PUBLIC: program detail (no ownership check) ────────────────────────────

  getProgramById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const programId = parseInt(String(req.params.id), 10);
      const program = await this.programsService.getProgramById(programId);
      res.status(200).json({ program });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      next(error);
    }
  };

  // ── COMPANY INTEREST ───────────────────────────────────────────────────────

  showInterest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.id), 10);
      const companyId = await this.programsService.getCompanyIdFromUserId(req.user.userId);
      const interest = await this.programsService.showInterest(programId, companyId, req.body);
      res.status(201).json({ message: 'Interest registered successfully', interest });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'INTEREST_FAILED');
        return;
      }
      next(error);
    }
  };

  updateCompanyStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.id), 10);
      const companyId = parseInt(String(req.params.companyId), 10);
      const updated = await this.programsService.updateCompanyStatus(
        programId,
        companyId,
        req.user.userId,
        req.body,
      );
      res.status(200).json({ message: 'Company status updated successfully', companyStatus: updated });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'STATUS_UPDATE_FAILED');
        return;
      }
      next(error);
    }
  };

  getProgramCompanies = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const programId = parseInt(String(req.params.id), 10);
      const companies = await this.programsService.getProgramCompanies(programId);
      res.status(200).json({ companies: companies ?? [] });
    } catch (error) {
      next(error);
    }
  };

  // ── PROGRAM OFFERS ─────────────────────────────────────────────────────────

  createOffer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId ?? req.params.id), 10);
      if (isNaN(programId)) { sendError(res, 400, 'Invalid program ID', 'INVALID_ID'); return; }
      const companyId = await this.programsService.getCompanyIdFromUserId(req.user.userId);
      const { jobOffer, programOffer } = await this.programsService.createProgramOffer(programId, companyId, req.body);

      res.status(201).json({
        message: 'Program offer created successfully',
        jobOffer: {
          ...jobOffer,
          jobOfferId: jobOffer.id,
        },
        programOffer: {
          ...programOffer,
          programOfferId: programOffer.id,
          jobOfferId: programOffer.jobOfferId ?? jobOffer.id,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('not found') ? 404 : 400;
        sendError(res, status, error.message, 'OFFER_CREATION_FAILED');
        return;
      }
      next(error);
    }
  };

  updateOfferStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId ?? req.params.id), 10);
      const programOfferId = parseInt(String(req.params.programOfferId ?? req.params.offerId), 10);
      if (isNaN(programId) || isNaN(programOfferId)) {
        sendError(res, 400, 'Invalid program or offer ID', 'INVALID_ID');
        return;
      }
      const updated = await this.programsService.updateOfferStatus(
        programId,
        programOfferId,
        req.user.userId,
        req.body,
      );

      res.status(200).json({ message: 'Offer status updated successfully', programOffer: updated });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendError(res, 400, error.message, 'OFFER_STATUS_FAILED');
        return;
      }
      next(error);
    }
  };

  getProgramOffers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const programId = parseInt(String(req.params.programId ?? req.params.id), 10);
      const offers = await this.programsService.getProgramOffers(programId);
      res.status(200).json({ programOffers: offers });
    } catch (error) {
      next(error);
    }
  };

  getUniversityProgramOffers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      if (isNaN(programId)) { sendError(res, 400, 'Invalid program ID', 'INVALID_ID'); return; }
      const universityId = await this.programsService.getUniversityIdFromUserId(req.user.userId);
      const offers = await this.programsService.getProgramOffersForUniversity(programId, universityId);
      res.status(200).json({ offers });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendError(res, 400, error.message, 'OFFERS_FETCH_FAILED');
        return;
      }
      next(error);
    }
  };

  getUniversityProgramOfferDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const programId = parseInt(String(req.params.programId), 10);
      const programOfferId = parseInt(String(req.params.programOfferId), 10);
      if (isNaN(programId) || isNaN(programOfferId)) {
        sendError(res, 400, 'Invalid program or offer ID', 'INVALID_ID');
        return;
      }
      const universityId = await this.programsService.getUniversityIdFromUserId(req.user.userId);
      const programOffer = await this.programsService.getProgramOfferDetailForUniversity(
        programId,
        programOfferId,
        universityId,
      );
      res.status(200).json({ programOffer });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('Unauthorized')) {
          sendError(res, 403, error.message, 'FORBIDDEN');
          return;
        }
        sendError(res, 400, error.message, 'OFFER_DETAIL_FAILED');
        return;
      }
      next(error);
    }
  };

  getMyProgramOffers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const companyId = await this.programsService.getCompanyIdFromUserId(req.user.userId);
      const programId = req.query.programId
        ? parseInt(String(req.query.programId), 10)
        : undefined;
      const result = await this.programsService.getCompanyProgramOffers(companyId, programId);
      res.status(200).json({ companyId, ...result });
    } catch (error) {
      next(error);
    }
  };

  // ── PROGRAM APPLICATIONS ──────────────────────────────────────────────────

  applyToOffer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const offerId = parseInt(String(req.params.offerId), 10);
      const studentId = await this.programsService.getStudentIdFromUserId(req.user.userId);
      const application = await this.programsService.applyToProgramOffer(
        offerId,
        studentId,
        req.body,
      );
      res.status(201).json({ message: 'Application created successfully', application });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'APPLICATION_FAILED');
        return;
      }
      next(error);
    }
  };

  getMyApplications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const studentId = await this.programsService.getStudentIdFromUserId(req.user.userId);
      const filters = req.query as unknown as GetProgramApplicationsDto;
      const result = await this.programsService.getStudentProgramApplications(studentId, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getOfferApplications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const offerId = parseInt(String(req.params.offerId), 10);
      const companyId = await this.programsService.getCompanyIdFromUserId(req.user.userId);
      const applications = await this.programsService.getOfferApplications(offerId, companyId);
      res.status(200).json({ applications });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'APPLICATIONS_FETCH_FAILED');
        return;
      }
      next(error);
    }
  };
}
