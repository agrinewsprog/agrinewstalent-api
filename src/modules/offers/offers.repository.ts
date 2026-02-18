import { JobOffer, Prisma, JobOfferStatus } from '@prisma/client';
import { prisma } from '../../config/database';

export interface OffersFilters {
  status?: JobOfferStatus;
  companyId?: number;
  location?: string;
  workMode?: string;
  contractType?: string;
  experienceLevel?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class OffersRepository {
  async findAll(
    filters?: OffersFilters,
    pagination?: PaginationOptions
  ): Promise<{ offers: JobOffer[]; total: number }> {
    const where: Prisma.JobOfferWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.location) {
      where.location = {
        contains: filters.location,
      };
    }

    if (filters?.workMode) {
      where.workMode = filters.workMode;
    }

    if (filters?.contractType) {
      where.contractType = filters.contractType;
    }

    if (filters?.experienceLevel) {
      where.experienceLevel = filters.experienceLevel;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [offers, total] = await Promise.all([
      prisma.jobOffer.findMany({
        where,
        include: {
          company: {
            select: {
              companyName: true,
              logoUrl: true,
              city: true,
              country: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.jobOffer.count({ where }),
    ]);

    return { offers, total };
  }

  async findById(id: number): Promise<JobOffer | null> {
    return prisma.jobOffer.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            userId: true,
            companyName: true,
            logoUrl: true,
            city: true,
            country: true,
            description: true,
            website: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });
  }

  async findByCompanyId(companyId: number): Promise<JobOffer[]> {
    return prisma.jobOffer.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(data: Prisma.JobOfferCreateInput): Promise<JobOffer> {
    return prisma.jobOffer.create({
      data,
      include: {
        company: {
          select: {
            companyName: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  async update(id: number, data: Prisma.JobOfferUpdateInput): Promise<JobOffer> {
    return prisma.jobOffer.update({
      where: { id },
      data,
      include: {
        company: {
          select: {
            companyName: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.jobOffer.delete({
      where: { id },
    });
  }

  async isOfferSaved(studentId: number, offerId: number): Promise<boolean> {
    const saved = await prisma.savedOffer.findUnique({
      where: {
        studentId_offerId: {
          studentId,
          offerId,
        },
      },
    });
    return !!saved;
  }

  async saveOffer(studentId: number, offerId: number): Promise<void> {
    await prisma.savedOffer.create({
      data: {
        studentId,
        offerId,
      },
    });
  }

  async unsaveOffer(studentId: number, offerId: number): Promise<void> {
    await prisma.savedOffer.delete({
      where: {
        studentId_offerId: {
          studentId,
          offerId,
        },
      },
    });
  }

  async getSavedOffers(studentId: number): Promise<JobOffer[]> {
    const savedOffers = await prisma.savedOffer.findMany({
      where: { studentId },
      include: {
        offer: {
          include: {
            company: {
              select: {
                companyName: true,
                logoUrl: true,
                city: true,
                country: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return savedOffers.map((saved) => saved.offer);
  }
}
