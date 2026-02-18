import { Request, Response, NextFunction } from 'express';
import { UniversitiesService } from './universities.service';
import { GetStudentsDto } from './universities.dto';

export class UniversitiesController {
  private universitiesService: UniversitiesService;

  constructor() {
    this.universitiesService = new UniversitiesService();
  }

  createInvite = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId
      );

      const invite = await this.universitiesService.createInvite(
        universityId,
        req.user.userId,
        req.body
      );

      res.status(201).json({
        message: 'Invite code created successfully',
        invite,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  redeemInvite = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const studentId = await this.universitiesService.getStudentIdFromUserId(
        req.user.userId
      );

      const membership = await this.universitiesService.redeemInvite(
        studentId,
        req.body
      );

      res.status(200).json({
        message: 'Successfully joined university',
        membership,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getMyStudents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId
      );

      const filters = req.query as unknown as GetStudentsDto;
      const result = await this.universitiesService.getUniversityStudents(
        universityId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getMyInvites = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId
      );

      const invites = await this.universitiesService.getUniversityInvites(universityId);

      res.status(200).json({ invites });
    } catch (error) {
      next(error);
    }
  };

  getMyStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const universityId = await this.universitiesService.getUniversityIdFromUserId(
        req.user.userId
      );

      const stats = await this.universitiesService.getUniversityStats(universityId);

      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };
}
