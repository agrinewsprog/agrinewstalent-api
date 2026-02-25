import { Request, Response, NextFunction } from 'express';
import { SavedOffersService } from './saved-offers.service';

export class SavedOffersController {
  private savedOffersService: SavedOffersService;

  constructor() {
    this.savedOffersService = new SavedOffersService();
  }

  // POST /api/saved-offers  { offerId }
  saveOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const saved = await this.savedOffersService.saveOffer(req.user.userId, offerId);
      res.status(201).json({ message: 'Offer saved successfully', savedOffer: saved });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  // DELETE /api/saved-offers/:offerId
  unsaveOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const offerId = parseInt(String(req.params.offerId), 10);
      if (!offerId || isNaN(offerId)) {
        res.status(400).json({ error: 'offerId is required' });
        return;
      }

      await this.savedOffersService.unsaveOffer(req.user.userId, offerId);
      res.status(200).json({ message: 'Offer removed from saved' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  // GET /api/saved-offers
  getSavedOffers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const saved = await this.savedOffersService.getSavedOffers(req.user.userId);
      res.status(200).json({ savedOffers: saved });
    } catch (error) {
      next(error);
    }
  };
}
