import { Request, Response, NextFunction } from 'express';
import { ProgramsService } from './programs.service';
import { GetProgramsDto, GetProgramApplicationsDto } from './programs.dto';

export class ProgramsController {
  private programsService: ProgramsService;

  constructor() {
    this.programsService = new ProgramsService();
  }

  // PROGRAM MANAGEMENT
  createProgram = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId
      );

      const program = await this.programsService.createProgram(universityId, req.body);

      res.status(201).json({
        message: 'Program created successfully',
        program,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getMyPrograms = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const universityId = await this.programsService.getUniversityIdFromUserId(
        req.user.userId
      );

      const filters = req.query as unknown as GetProgramsDto;
      const result = await this.programsService.getUniversityPrograms(
        universityId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getProgramById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const programId = parseInt(String(req.params.id), 10);
      const program = await this.programsService.getProgramById(programId);

      res.status(200).json(program);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  // COMPANY INTEREST
  showInterest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const programId = parseInt(String(req.params.id), 10);
      const companyId = await this.programsService.getCompanyIdFromUserId(
        req.user.userId
      );

      const interest = await this.programsService.showInterest(
        programId,
        companyId,
        req.body
      );

      res.status(201).json({
        message: 'Interest registered successfully',
        interest,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  updateCompanyStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const programId = parseInt(String(req.params.id), 10);
      const companyId = parseInt(String(req.params.companyId), 10);

      const updated = await this.programsService.updateCompanyStatus(
        programId,
        companyId,
        req.user.userId,
        req.body
      );

      res.status(200).json({
        message: 'Company status updated successfully',
        companyStatus: updated,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getProgramCompanies = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const programId = parseInt(String(req.params.id), 10);
      const companies = await this.programsService.getProgramCompanies(programId);

      res.status(200).json({ companies });
    } catch (error) {
      next(error);
    }
  };

  // PROGRAM OFFERS
  createOffer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const programId = parseInt(String(req.params.id), 10);
      const companyId = await this.programsService.getCompanyIdFromUserId(
        req.user.userId
      );

      const offer = await this.programsService.createProgramOffer(
        programId,
        companyId,
        req.body
      );

      res.status(201).json({
        message: 'Offer created successfully. Pending university approval.',
        offer,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  updateOfferStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const programId = parseInt(String(req.params.id), 10);
      const offerId = parseInt(String(req.params.offerId), 10);

      const updated = await this.programsService.updateOfferStatus(
        programId,
        offerId,
        req.user.userId,
        req.body
      );

      res.status(200).json({
        message: 'Offer status updated successfully',
        offer: updated,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getProgramOffers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const programId = parseInt(String(req.params.id), 10);
      const offers = await this.programsService.getProgramOffers(programId);

      res.status(200).json({ offers });
    } catch (error) {
      next(error);
    }
  };

  getMyProgramOffers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const companyId = await this.programsService.getCompanyIdFromUserId(
        req.user.userId
      );

      const programId = req.query.programId
        ? parseInt(String(req.query.programId), 10)
        : undefined;

      const offers = await this.programsService.getCompanyProgramOffers(
        companyId,
        programId
      );

      res.status(200).json({ offers });
    } catch (error) {
      next(error);
    }
  };

  // PROGRAM APPLICATIONS
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
      const studentId = await this.programsService.getStudentIdFromUserId(
        req.user.userId
      );

      const application = await this.programsService.applyToProgramOffer(
        offerId,
        studentId,
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

  getMyApplications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const studentId = await this.programsService.getStudentIdFromUserId(
        req.user.userId
      );

      const filters = req.query as unknown as GetProgramApplicationsDto;
      const result = await this.programsService.getStudentProgramApplications(
        studentId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getOfferApplications = async (
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
      const companyId = await this.programsService.getCompanyIdFromUserId(
        req.user.userId
      );

      const applications = await this.programsService.getOfferApplications(
        offerId,
        companyId
      );

      res.status(200).json({ applications });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };
}
