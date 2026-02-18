import { JobOffer, JobOfferStatus } from '@prisma/client';
import { OffersRepository } from './offers.repository';
import { CreateOfferDto, UpdateOfferDto } from './offers.dto';

export class OffersService {
  private offersRepository: OffersRepository;

  constructor() {
    this.offersRepository = new OffersRepository();
  }

  async getAllOffers(filters?: {
    status?: JobOfferStatus;
  }): Promise<JobOffer[]> {
    return this.offersRepository.findAll(filters);
  }

  async getOfferById(id: number): Promise<JobOffer | null> {
    return this.offersRepository.findById(id);
  }

  async getCompanyOffers(companyId: number): Promise<JobOffer[]> {
    return this.offersRepository.findByCompanyId(companyId);
  }

  async createOffer(
    companyId: number,
    dto: CreateOfferDto
  ): Promise<JobOffer> {
    return this.offersRepository.create({
      company: {
        connect: { id: companyId },
      },
      title: dto.title,
      description: dto.description,
      requirements: dto.requirements,
      location: dto.location,
      salary: dto.salary,
      contractType: dto.contractType,
      experienceLevel: dto.experienceLevel,
      status: JobOfferStatus.DRAFT,
    });
  }

  async updateOffer(
    id: number,
    companyId: number,
    dto: UpdateOfferDto
  ): Promise<JobOffer> {
    // Verify offer belongs to company
    const offer = await this.offersRepository.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }
    if (offer.companyId !== companyId) {
      throw new Error('Unauthorized to update this offer');
    }

    return this.offersRepository.update(id, dto);
  }

  async deleteOffer(id: number, companyId: number): Promise<void> {
    // Verify offer belongs to company
    const offer = await this.offersRepository.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }
    if (offer.companyId !== companyId) {
      throw new Error('Unauthorized to delete this offer');
    }

    await this.offersRepository.delete(id);
  }

  async publishOffer(id: number, companyId: number): Promise<JobOffer> {
    // Verify offer belongs to company
    const offer = await this.offersRepository.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }
    if (offer.companyId !== companyId) {
      throw new Error('Unauthorized to publish this offer');
    }

    return this.offersRepository.update(id, {
      status: JobOfferStatus.PUBLISHED,
      publishedAt: new Date(),
    });
  }

  async closeOffer(id: number, companyId: number): Promise<JobOffer> {
    // Verify offer belongs to company
    const offer = await this.offersRepository.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }
    if (offer.companyId !== companyId) {
      throw new Error('Unauthorized to close this offer');
    }

    return this.offersRepository.update(id, {
      status: JobOfferStatus.CLOSED,
      closedAt: new Date(),
    });
  }
}
