import { Request, Response, NextFunction } from 'express';
import { OffersService } from './offers.service';
import { GetOffersDto } from './offers.dto';

export class OffersController {
  private offersService: OffersService;

  constructor() {
    this.offersService = new OffersService();
  }

  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const filters = req.query as unknown as GetOffersDto;
      const result = await this.offersService.getAllOffers(filters);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id), 10);

      const offer = await this.offersService.getOfferById(id);

      if (!offer) {
        res.status(404).json({ error: 'Offer not found' });
        return;
      }

      res.status(200).json({ offer });
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const companyId = await this.offersService.getCompanyIdFromUserId(
        req.user.userId
      );

      const offer = await this.offersService.createOffer(companyId, req.body);

      res.status(201).json({
        message: 'Offer created successfully',
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

  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(String(req.params.id), 10);
      const companyId = await this.offersService.getCompanyIdFromUserId(
        req.user.userId
      );

      const offer = await this.offersService.updateOffer(
        id,
        companyId,
        req.body
      );

      res.status(200).json({
        message: 'Offer updated successfully',
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

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(String(req.params.id), 10);
      const companyId = await this.offersService.getCompanyIdFromUserId(
        req.user.userId
      );

      await this.offersService.deleteOffer(id, companyId);

      res.status(200).json({ message: 'Offer deleted successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  publish = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(String(req.params.id), 10);
      const companyId = await this.offersService.getCompanyIdFromUserId(
        req.user.userId
      );

      const offer = await this.offersService.publishOffer(id, companyId);

      res.status(200).json({
        message: 'Offer published successfully',
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

  close = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(String(req.params.id), 10);
      const companyId = await this.offersService.getCompanyIdFromUserId(
        req.user.userId
      );

      const offer = await this.offersService.closeOffer(id, companyId);

      res.status(200).json({
        message: 'Offer closed successfully',
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

  changeStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(String(req.params.id), 10);
      const { status } = req.body as { status: string };

      const companyId = await this.offersService.getCompanyIdFromUserId(
        req.user.userId
      );

      const { JobOfferStatus } = await import('@prisma/client');
      const validStatuses = Object.values(JobOfferStatus) as string[];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        });
        return;
      }

      const offer = await this.offersService.changeOfferStatus(
        id,
        companyId,
        status as import('@prisma/client').JobOfferStatus
      );

      res.status(200).json({
        message: 'Offer status updated successfully',
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

  save = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const offerId = parseInt(String(req.params.id), 10);
      const studentId = await this.offersService.getStudentIdFromUserId(
        req.user.userId
      );

      await this.offersService.saveOffer(studentId, offerId);

      res.status(200).json({ message: 'Offer saved successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  unsave = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const offerId = parseInt(String(req.params.id), 10);
      const studentId = await this.offersService.getStudentIdFromUserId(
        req.user.userId
      );

      await this.offersService.unsaveOffer(studentId, offerId);

      res.status(200).json({ message: 'Offer unsaved successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getSaved = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const studentId = await this.offersService.getStudentIdFromUserId(
        req.user.userId
      );

      const offers = await this.offersService.getSavedOffers(studentId);

      res.status(200).json({ offers });
    } catch (error) {
      next(error);
    }
  };
}
