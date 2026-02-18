import { JobOffer, Prisma, JobOfferStatus } from '@prisma/client';
import { prisma } from '../../config/database';

export class OffersRepository {
  async findAll(filters?: { status?: JobOfferStatus }): Promise<JobOffer[]> {
    return prisma.jobOffer.findMany({
      where: filters,
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: number): Promise<JobOffer | null> {
    return prisma.jobOffer.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            companyName: true,
            logoUrl: true,
            city: true,
            country: true,
            description: true,
          },
        },
      },
    });
  }

  async findByCompanyId(companyId: number): Promise<JobOffer[]> {
    return prisma.jobOffer.findMany({
      where: { companyId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(data: Prisma.JobOfferCreateInput): Promise<JobOffer> {
    return prisma.jobOffer.create({
      data,
    });
  }

  async update(id: number, data: Prisma.JobOfferUpdateInput): Promise<JobOffer> {
    return prisma.jobOffer.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.jobOffer.delete({
      where: { id },
    });
  }
}
