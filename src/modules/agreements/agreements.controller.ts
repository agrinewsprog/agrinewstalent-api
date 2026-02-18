import { Request, Response } from 'express';
import { AgreementsService } from './agreements.service';
import { createAgreementSchema, updateAgreementStatusSchema, listAgreementsSchema } from './agreements.dto';
import { prisma } from '../../config/database';

export class AgreementsController {
  private agreementsService: AgreementsService;

  constructor() {
    this.agreementsService = new AgreementsService();
  }

  // ============================================================
  // CREATE AGREEMENT
  // ============================================================

  createAgreement = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const dto = createAgreementSchema.parse(req.body);
      const userRole = req.user.role;
      const userId = req.user.userId;
      
      let profileId: number;
      if (userRole === 'UNIVERSITY') {
        const universityProfile = await prisma.universityProfile.findUnique({
          where: { userId },
        });
        if (!universityProfile) {
          res.status(404).json({ error: 'University profile not found' });
          return;
        }
        profileId = universityProfile.id;
      } else if (userRole === 'COMPANY') {
        const companyProfile = await prisma.companyProfile.findUnique({
          where: { userId },
        });
        if (!companyProfile) {
          res.status(404).json({ error: 'Company profile not found' });
          return;
        }
        profileId = companyProfile.id;
      } else {
        res.status(403).json({ error: 'Only universities and companies can create agreements' });
        return;
      }

      const result = await this.agreementsService.createAgreement(dto, userRole, profileId);

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // LIST AGREEMENTS
  // ============================================================

  listAgreements = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = listAgreementsSchema.parse(req.query);
      const result = await this.agreementsService.listAgreements(dto);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // GET AGREEMENT BY ID
  // ============================================================

  getAgreementById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string);
      const result = await this.agreementsService.getAgreementById(id);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Agreement not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // UPDATE AGREEMENT STATUS
  // ============================================================

  updateAgreementStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(req.params.id as string);
      const dto = updateAgreementStatusSchema.parse(req.body);
      const userRole = req.user.role;
      const userId = req.user.userId;

      let profileId: number;
      if (userRole === 'UNIVERSITY') {
        const universityProfile = await prisma.universityProfile.findUnique({
          where: { userId },
        });
        if (!universityProfile) {
          res.status(404).json({ error: 'University profile not found' });
          return;
        }
        profileId = universityProfile.id;
      } else if (userRole === 'COMPANY') {
        const companyProfile = await prisma.companyProfile.findUnique({
          where: { userId },
        });
        if (!companyProfile) {
          res.status(404).json({ error: 'Company profile not found' });
          return;
        }
        profileId = companyProfile.id;
      } else {
        res.status(403).json({ error: 'Only universities and companies can update agreements' });
        return;
      }

      const result = await this.agreementsService.updateAgreementStatus(id, dto, userRole, profileId);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Agreement not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Unauthorized to update this agreement') {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // GET MY AGREEMENTS
  // ============================================================

  getMyAgreements = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userRole = req.user.role;
      const userId = req.user.userId;

      let profileId: number;
      if (userRole === 'UNIVERSITY') {
        const universityProfile = await prisma.universityProfile.findUnique({
          where: { userId },
        });
        if (!universityProfile) {
          res.status(404).json({ error: 'University profile not found' });
          return;
        }
        profileId = universityProfile.id;
      } else if (userRole === 'COMPANY') {
        const companyProfile = await prisma.companyProfile.findUnique({
          where: { userId },
        });
        if (!companyProfile) {
          res.status(404).json({ error: 'Company profile not found' });
          return;
        }
        profileId = companyProfile.id;
      } else {
        res.status(403).json({ error: 'Only universities and companies can have agreements' });
        return;
      }

      const result = await this.agreementsService.getMyAgreements(userRole, profileId);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // DELETE AGREEMENT
  // ============================================================

  deleteAgreement = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(req.params.id as string);
      const userRole = req.user.role;
      const userId = req.user.userId;

      let profileId: number;
      if (userRole === 'UNIVERSITY') {
        const universityProfile = await prisma.universityProfile.findUnique({
          where: { userId },
        });
        if (!universityProfile) {
          res.status(404).json({ error: 'University profile not found' });
          return;
        }
        profileId = universityProfile.id;
      } else if (userRole === 'COMPANY') {
        const companyProfile = await prisma.companyProfile.findUnique({
          where: { userId },
        });
        if (!companyProfile) {
          res.status(404).json({ error: 'Company profile not found' });
          return;
        }
        profileId = companyProfile.id;
      } else {
        res.status(403).json({ error: 'Only universities and companies can delete agreements' });
        return;
      }

      const result = await this.agreementsService.deleteAgreement(id, userRole, profileId);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Agreement not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Unauthorized to delete this agreement') {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  };
}
