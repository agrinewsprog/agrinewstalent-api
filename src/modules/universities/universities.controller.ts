import { Request, Response, NextFunction } from 'express';
import { UniversitiesService } from './universities.service';
import { GetStudentsDto } from './universities.dto';

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

export class UniversitiesController {
  private universitiesService: UniversitiesService;

  constructor() {
    this.universitiesService = new UniversitiesService();
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  getMyProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const profile = await this.universitiesService.getProfile(req.user.userId);
      res.status(200).json({ profile });
    } catch (error) {
      if (error instanceof Error && error.message === 'University profile not found') {
        sendError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      next(error);
    }
  };

  updateMyProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const profile = await this.universitiesService.updateProfile(
        req.user.userId,
        req.body,
      );
      res.status(200).json({ message: 'Profile updated successfully', profile });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'UPDATE_FAILED');
        return;
      }
      next(error);
    }
  };

  // ── Pending offers ─────────────────────────────────────────────────────────

  getPendingOffers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const result = await this.universitiesService.getPendingOffers(req.user.userId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'PENDING_OFFERS_ERROR');
        return;
      }
      next(error);
    }
  };

  // ── Dashboard ──────────────────────────────────────────────────────────────

  getMyDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const metrics = await this.universitiesService.getDashboard(req.user.userId);
      res.status(200).json({ dashboard: metrics });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'DASHBOARD_ERROR');
        return;
      }
      next(error);
    }
  };

  // ── Invites ────────────────────────────────────────────────────────────────

  createInvite = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const invite = await this.universitiesService.createInvite(
        universityId,
        req.user.userId,
        req.body,
      );
      res.status(201).json({ message: 'Invite code created successfully', invite });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'INVITE_CREATION_FAILED');
        return;
      }
      next(error);
    }
  };

  redeemInvite = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const studentId = await this.universitiesService.getStudentIdFromUserId(
        req.user.userId,
      );
      const result = await this.universitiesService.redeemInvite(studentId, req.body);
      res.status(200).json({
        message: 'Successfully joined university',
        membership: result.membership,
        invite: result.invite,
      });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'REDEEM_FAILED');
        return;
      }
      next(error);
    }
  };

  getMyInvites = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const invites = await this.universitiesService.getUniversityInvites(universityId);
      res.status(200).json({ invites });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'INVITES_FETCH_FAILED');
        return;
      }
      next(error);
    }
  };

  deleteInvite = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const inviteId = parseInt(String(req.params.inviteId), 10);
      if (isNaN(inviteId)) { sendError(res, 400, 'Invalid invite ID', 'INVALID_ID'); return; }
      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const deletedId = await this.universitiesService.deleteInvite(universityId, inviteId);
      res.status(200).json({ message: 'Invite deleted successfully', id: deletedId });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invite not found') {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        sendError(res, 400, error.message, 'INVITE_DELETE_FAILED');
        return;
      }
      next(error);
    }
  };

  // ── Students ───────────────────────────────────────────────────────────────

  getMyStudents = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const filters = req.query as unknown as GetStudentsDto;
      const result = await this.universitiesService.getUniversityStudents(
        universityId,
        filters,
      );
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 400, error.message, 'STUDENTS_FETCH_FAILED');
        return;
      }
      next(error);
    }
  };

  getStudentDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const rawParam = req.params.studentId;
      const studentId = Number(rawParam);

      if (!rawParam || !Number.isFinite(studentId) || studentId <= 0) {
        sendError(res, 400, 'Invalid student ID', 'INVALID_ID');
        return;
      }

      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const result = await this.universitiesService.getStudentDetail(universityId, studentId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Student not found') {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        if (error.message.includes('profile not found')) {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        sendError(res, 400, error.message, 'STUDENT_DETAIL_FAILED');
        return;
      }
      next(error);
    }
  };

  // ── Logo upload ────────────────────────────────────────────────────────────

  uploadLogo = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      if (!req.file) { sendError(res, 400, 'No file uploaded. Use field name "logo"', 'NO_FILE'); return; }

      const logoUrl = await this.universitiesService.uploadLogo(req.user.userId, req.file);
      res.status(200).json({ message: 'Logo uploaded successfully', logoUrl });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('not found') ? 404 : 400;
        sendError(res, status, error.message, 'LOGO_UPLOAD_FAILED');
        return;
      }
      next(error);
    }
  };

  // ── Stats (compatibilidad) ─────────────────────────────────────────────────

  getMyStats = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const stats = await this.universitiesService.getUniversityStats(universityId);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };

  // ── Company profile (informational view) ───────────────────────────────────

  getCompanyProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) { sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED'); return; }
      const companyId = parseInt(String(req.params.companyId), 10);
      if (isNaN(companyId)) {
        sendError(res, 400, 'Invalid company ID', 'INVALID_ID');
        return;
      }
      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId,
      );
      const result = await this.universitiesService.getCompanyProfile(universityId, companyId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Company not found' || error.message === 'Company has no relationship with this university') {
          sendError(res, 404, error.message, 'NOT_FOUND');
          return;
        }
        sendError(res, 400, error.message, 'COMPANY_PROFILE_ERROR');
        return;
      }
      next(error);
    }
  };
}
