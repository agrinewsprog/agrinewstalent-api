import { JobOffer, JobOfferStatus } from '@prisma/client';
import { OffersRepository, OffersFilters } from './offers.repository';
import { CreateOfferDto, UpdateOfferDto, GetOffersDto } from './offers.dto';
import { prisma } from '../../config/database';

export class OffersService {
  private offersRepository: OffersRepository;

  constructor() {
    this.offersRepository = new OffersRepository();
  }

  async getAllOffers(
    filters: GetOffersDto
  ): Promise<{ offers: JobOffer[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 10, ...otherFilters } = filters;

    const { offers, total } = await this.offersRepository.findAll(
      otherFilters as OffersFilters,
      { page, limit }
    );

    return {
      offers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOfferById(id: number): Promise<JobOffer | null> {
    const offer = await this.offersRepository.findById(id);
    if (offer?.programOffer) {
      return null;
    }
    return offer;
  }

  private ensureNotProgramLinked(offer: any, action: string): void {
    if (offer?.programOffer) {
      throw new Error(
        `Program-linked offers cannot be ${action} through /api/offers. Use the program offer flow with programId=${offer.programOffer.programId} and programOfferId=${offer.programOffer.id}.`,
      );
    }
  }

  async getCompanyOffers(companyId: number): Promise<any> {
    const offers = await this.offersRepository.findByCompanyId(companyId);

    const items = offers.map((offer: any) => ({
      jobOfferId: offer.id,
      title: offer.title,
      description: offer.description,
      requirements: offer.requirements ?? null,
      location: offer.location ?? null,
      workMode: offer.workMode ?? null,
      salary: offer.salary ?? null,
      contractType: offer.contractType ?? null,
      experienceLevel: offer.experienceLevel ?? null,
      status: offer.status,
      publishedAt: offer.publishedAt ?? null,
      closedAt: offer.closedAt ?? null,
      expiresAt: offer.expiresAt ?? null,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
      applicationsCount: offer._count?.applications ?? 0,
      isProgramLinked: false,
      hasApplications: (offer._count?.applications ?? 0) > 0,
      canEdit: true,
      canPublish: offer.status === JobOfferStatus.DRAFT,
      canClose: offer.status === JobOfferStatus.PUBLISHED,
    })) as any[];

    return {
      offers: items,
      meta: {
        totalOffers: items.length,
        hasOffers: items.length > 0,
        hasPublishedOffers: items.some((offer) => offer.status === JobOfferStatus.PUBLISHED),
        hasApplications: items.some((offer) => offer.hasApplications),
        emptyState: items.length === 0
          ? {
              kind: 'NO_OFFERS',
              message: 'This company has not created normal offers yet.',
            }
          : null,
      },
    };
  }

  async createOffer(companyId: number, dto: CreateOfferDto): Promise<JobOffer> {
    const data: any = {
      company: {
        connect: { id: companyId },
      },
      title: dto.title,
      description: dto.description,
      requirements: dto.requirements,
      location: dto.location,
      workMode: dto.workMode,
      salary: dto.salary,
      contractType: dto.contractType,
      experienceLevel: dto.experienceLevel,
      status: JobOfferStatus.DRAFT,
    };

    if (dto.expiresAt) {
      data.expiresAt = new Date(dto.expiresAt);
    }

    return this.offersRepository.create(data);
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
    this.ensureNotProgramLinked(offer, 'updated');

    const data: any = { ...dto };

    if (dto.expiresAt) {
      data.expiresAt = new Date(dto.expiresAt);
    }

    return this.offersRepository.update(id, data);
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
    this.ensureNotProgramLinked(offer, 'deleted');

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
    this.ensureNotProgramLinked(offer, 'published');

    if (offer.status !== JobOfferStatus.DRAFT) {
      throw new Error('Only draft offers can be published');
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
    this.ensureNotProgramLinked(offer, 'closed');

    if (offer.status !== JobOfferStatus.PUBLISHED) {
      throw new Error('Only published offers can be closed');
    }

    return this.offersRepository.update(id, {
      status: JobOfferStatus.CLOSED,
      closedAt: new Date(),
    });
  }

  /**
   * Change the status of an offer to any valid target status.
   * Allowed transitions:
   *   DRAFT      → PUBLISHED | CLOSED
   *   PUBLISHED  → DRAFT     | CLOSED
   *   CLOSED     → DRAFT     | PUBLISHED
   */
  async changeOfferStatus(
    id: number,
    companyId: number,
    targetStatus: JobOfferStatus
  ): Promise<JobOffer> {
    const offer = await this.offersRepository.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }
    if (offer.companyId !== companyId) {
      throw new Error('Unauthorized to change status of this offer');
    }
    this.ensureNotProgramLinked(offer, 'managed');

    const data: Record<string, unknown> = { status: targetStatus };

    if (targetStatus === JobOfferStatus.PUBLISHED && !offer.publishedAt) {
      data.publishedAt = new Date();
    }
    if (targetStatus === JobOfferStatus.CLOSED && !offer.closedAt) {
      data.closedAt = new Date();
    }

    return this.offersRepository.update(id, data);
  }

  async saveOffer(studentId: number, offerId: number): Promise<void> {
    // Verify offer exists and is published
    const offer = await this.offersRepository.findById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }
    this.ensureNotProgramLinked(offer, 'saved');
    if (offer.status !== JobOfferStatus.PUBLISHED) {
      throw new Error('Only published offers can be saved');
    }

    // Check if already saved
    const isSaved = await this.offersRepository.isOfferSaved(studentId, offerId);
    if (isSaved) {
      throw new Error('Offer already saved');
    }

    await this.offersRepository.saveOffer(studentId, offerId);
  }

  async unsaveOffer(studentId: number, offerId: number): Promise<void> {
    // Check if saved
    const isSaved = await this.offersRepository.isOfferSaved(studentId, offerId);
    if (!isSaved) {
      throw new Error('Offer not saved');
    }

    await this.offersRepository.unsaveOffer(studentId, offerId);
  }

  async getSavedOffers(studentId: number): Promise<any[]> {
    const offers = await this.offersRepository.getSavedOffers(studentId);

    return offers.map((offer: any) => {
      const application = offer.applications?.[0] ?? null;

      return {
        ...offer,
        jobOfferId: offer.id,
        isSaved: true,
        alreadyApplied: Boolean(application),
        application: application
          ? {
              applicationId: application.id,
              status: application.status,
              appliedAt: application.appliedAt,
            }
          : null,
      };
    });
  }

  async getCompanyIdFromUserId(userId: number): Promise<number> {
    const companyProfile = await prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!companyProfile) {
      throw new Error('Company profile not found');
    }

    return companyProfile.id;
  }

  async getStudentIdFromUserId(userId: number): Promise<number> {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!studentProfile) {
      throw new Error('Student profile not found');
    }

    return studentProfile.id;
  }
}
