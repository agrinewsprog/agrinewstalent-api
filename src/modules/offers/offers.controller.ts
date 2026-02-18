import { Request, Response, NextFunction } from 'express';
import { OffersService } from './offers.service';
import { JobOfferStatus } from '@prisma/client';

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
      const { status } = req.query;

      const filters: any = {};
      if (status) {
        filters.status = status as JobOfferStatus;
      }

      const offers = await this.offersService.getAllOffers(filters);

      res.status(200).json({ offers });
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

      // Get company profile ID (assuming user has companyProfile)
      // In real app, you'd fetch this from the user's company profile
      const companyId = req.user.userId; // Placeholder - needs proper implementation

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
      const companyId = req.user.userId; // Placeholder

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
      const companyId = req.user.userId; // Placeholder

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
      const companyId = req.user.userId; // Placeholder

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
      const companyId = req.user.userId; // Placeholder

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
}
