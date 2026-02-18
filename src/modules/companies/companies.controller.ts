import { Request, Response } from 'express';
import { CompaniesService } from './companies.service';
import { listCandidatesSchema } from './companies.dto';
import { prisma } from '../../config/database';

export class CompaniesController {
  private companiesService: CompaniesService;

  constructor() {
    this.companiesService = new CompaniesService();
  }

  // ============================================================
  // LIST MY CANDIDATES
  // ============================================================

  listMyCandidates = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (req.user.role !== 'COMPANY') {
        res.status(403).json({ error: 'Only companies can access candidates' });
        return;
      }

      // Get company profile
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        res.status(404).json({ error: 'Company profile not found' });
        return;
      }

      const dto = listCandidatesSchema.parse(req).query;
      const result = await this.companiesService.listMyCandidates(
        companyProfile.id,
        dto
      );

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // GET CANDIDATE BY ID
  // ============================================================

  getCandidateById = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (req.user.role !== 'COMPANY') {
        res.status(403).json({ error: 'Only companies can access candidates' });
        return;
      }

      // Get company profile
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        res.status(404).json({ error: 'Company profile not found' });
        return;
      }

      const applicationId = parseInt(req.params.id as string);
      const result = await this.companiesService.getCandidateById(
        applicationId,
        companyProfile.id
      );

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // GET CANDIDATE STATISTICS
  // ============================================================

  getMyCandidateStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (req.user.role !== 'COMPANY') {
        res.status(403).json({ error: 'Only companies can access statistics' });
        return;
      }

      // Get company profile
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!companyProfile) {
        res.status(404).json({ error: 'Company profile not found' });
        return;
      }

      const result = await this.companiesService.getMyCandidateStats(
        companyProfile.id
      );

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
