import { JobApplication, ApplicationEvent, CompanyNote, ApplicationStatus, JobOfferStatus } from '@prisma/client';
import { ApplicationsRepository, ApplicationsFilters } from './applications.repository';
import { ApplyToOfferDto, UpdateApplicationStatusDto, CreateNoteDto, GetApplicationsDto } from './applications.dto';
import { prisma } from '../../config/database';

export class ApplicationsService {
  private applicationsRepository: ApplicationsRepository;

  constructor() {
    this.applicationsRepository = new ApplicationsRepository();
  }

  async applyToOffer(
    studentId: number,
    offerId: number,
    dto: ApplyToOfferDto
  ): Promise<JobApplication> {
    // Verify offer exists and is published
    const offer = await prisma.jobOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status !== JobOfferStatus.PUBLISHED) {
      throw new Error('Can only apply to published offers');
    }

    // Check if already applied
    const existing = await this.applicationsRepository.findByStudentAndOffer(
      studentId,
      offerId
    );

    if (existing) {
      throw new Error('Already applied to this offer');
    }

    // Create application
    const application = await this.applicationsRepository.create({
      student: {
        connect: { id: studentId },
      },
      offer: {
        connect: { id: offerId },
      },
      coverLetter: dto.coverLetter,
      resumeUrl: dto.resumeUrl,
      status: ApplicationStatus.SUBMITTED,
    });

    // Create initial event
    await this.applicationsRepository.addEvent({
      application: {
        connect: { id: application.id },
      },
      eventType: 'application_submitted',
      toStatus: ApplicationStatus.SUBMITTED,
      description: 'Application submitted',
      createdBy: 'student',
    });

    return application;
  }

  async getStudentApplications(
    studentId: number,
    filters: GetApplicationsDto
  ): Promise<{ applications: JobApplication[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, ...otherFilters } = filters;

    const { applications, total } = await this.applicationsRepository.findAll(
      { ...otherFilters, studentId } as ApplicationsFilters,
      { page, limit }
    );

    return {
      applications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCompanyApplications(
    companyId: number,
    filters: GetApplicationsDto
  ): Promise<{ applications: JobApplication[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, ...otherFilters } = filters;

    const { applications, total } = await this.applicationsRepository.findAll(
      { ...otherFilters, companyId } as ApplicationsFilters,
      { page, limit }
    );

    return {
      applications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getApplicationById(id: number): Promise<JobApplication | null> {
    return this.applicationsRepository.findById(id);
  }

  async updateApplicationStatus(
    id: number,
    companyId: number,
    dto: UpdateApplicationStatusDto
  ): Promise<JobApplication> {
    // Verify application exists and belongs to company
    const application = await this.applicationsRepository.findById(id);
    if (!application) {
      throw new Error('Application not found');
    }

    // Type assertion after include
    const offer = application.offer as any;
    if (offer.company.id !== companyId) {
      throw new Error('Unauthorized to update this application');
    }

    return this.applicationsRepository.updateStatus(
      id,
      dto.status,
      application.status
    );
  }

  async addNote(
    applicationId: number,
    companyId: number,
    dto: CreateNoteDto
  ): Promise<CompanyNote> {
    // Verify application exists and belongs to company
    const application = await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Type assertion after include
    const offer = application.offer as any;
    if (offer.company.id !== companyId) {
      throw new Error('Unauthorized to add note to this application');
    }

    const note = await this.applicationsRepository.addNote({
      company: {
        connect: { id: companyId },
      },
      application: {
        connect: { id: applicationId },
      },
      note: dto.note,
      isPrivate: dto.isPrivate ?? true,
    });

    // Create event
    await this.applicationsRepository.addEvent({
      application: {
        connect: { id: applicationId },
      },
      eventType: 'note_added',
      description: 'Company added a note',
      createdBy: 'company',
    });

    return note;
  }

  async getTimeline(applicationId: number, userId: number, role: string): Promise<ApplicationEvent[]> {
    // Verify access
    const application = await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Students can only see their own applications
    if (role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId },
      });
      if (!studentProfile || application.studentId !== studentProfile.id) {
        throw new Error('Unauthorized to view this timeline');
      }
    }

    // Companies can only see applications to their offers
    if (role === 'COMPANY') {
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { userId },
      });
      // Type assertion after include
      const offer = application.offer as any;
      if (!companyProfile || offer.company.id !== companyProfile.id) {
        throw new Error('Unauthorized to view this timeline');
      }
    }

    return this.applicationsRepository.getTimeline(applicationId);
  }

  async getNotes(applicationId: number, companyId: number): Promise<CompanyNote[]> {
    // Verify application belongs to company
    const application = await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Type assertion after include
    const offer = application.offer as any;
    if (offer.company.id !== companyId) {
      throw new Error('Unauthorized to view notes for this application');
    }

    return this.applicationsRepository.getNotes(applicationId);
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

  async getCompanyIdFromUserId(userId: number): Promise<number> {
    const companyProfile = await prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!companyProfile) {
      throw new Error('Company profile not found');
    }

    return companyProfile.id;
  }
}
