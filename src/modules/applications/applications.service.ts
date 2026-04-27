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
      status: ApplicationStatus.PENDING,
    });

    // Create initial event
    await this.applicationsRepository.addEvent({
      application: {
        connect: { id: application.id },
      },
      eventType: 'application_created',
      toStatus: ApplicationStatus.PENDING,
      description: 'Application created',
      createdBy: 'student',
    });

    return application;
  }

  async getStudentApplications(
    studentId: number,
    filters: GetApplicationsDto
  ) {
    const { page = 1, limit = 20, ...otherFilters } = filters;

    // 1) JobApplications (normal + program-linked)
    const { applications: jobApps, total: jobTotal } = await this.applicationsRepository.findAll(
      { ...otherFilters, studentId } as ApplicationsFilters,
      { page, limit }
    );

    // 2) ProgramApplications
    const { applications: programApps, total: programTotal } =
      await this.applicationsRepository.findStudentProgramApplications(studentId, { page, limit });

    // 3) Normalize JobApplications
    const normalizedJobApps = jobApps.map((app: any) => {
      const po = app.offer?.programOffer;
      return {
        applicationId: app.id,
        source: 'JobApplication' as const,
        offerId: app.offerId,
        jobOfferId: app.offerId,
        offerTitle: app.offer?.title ?? null,
        status: app.status,
        coverLetter: app.coverLetter ?? null,
        resumeUrl: app.resumeUrl ?? null,
        createdAt: app.appliedAt,
        appliedAt: app.appliedAt,
        updatedAt: app.updatedAt,
        companyId: app.offer?.company?.id ?? app.offer?.companyId ?? null,
        companyName: app.offer?.company?.companyName ?? null,
        companyLogoUrl: app.offer?.company?.logoUrl ?? null,
        // Program context (if offer is linked to a program)
        programOfferId: po?.id ?? null,
        programId: po?.program?.id ?? po?.programId ?? null,
        programTitle: po?.program?.title ?? null,
        // Full student + offer for backwards compatibility
        student: app.student,
        offer: app.offer,
        _count: app._count,
      };
    });

    // 4) Normalize ProgramApplications
    const normalizedProgramApps = programApps.map((app: any) => ({
      applicationId: app.id,
      source: 'ProgramApplication' as const,
      offerId: app.offer?.jobOffer?.id ?? null,
      jobOfferId: app.offer?.jobOffer?.id ?? null,
      offerTitle: app.offer?.jobOffer?.title ?? app.offer?.title ?? null,
      status: app.status,
      coverLetter: app.coverLetter ?? null,
      resumeUrl: app.resumeUrl ?? null,
      createdAt: app.appliedAt,
      appliedAt: app.appliedAt,
      updatedAt: app.reviewedAt ?? app.appliedAt,
      companyId: app.offer?.company?.id ?? app.offer?.companyId ?? null,
      companyName: app.offer?.company?.companyName ?? null,
      companyLogoUrl: app.offer?.company?.logoUrl ?? null,
      // Program context
      programOfferId: app.offer?.id ?? null,
      programId: app.offer?.program?.id ?? null,
      programTitle: app.offer?.program?.title ?? null,
      // Minimal student/offer
      student: null,
      offer: null,
      _count: null,
    }));

    // 5) Deduplicate: same program offer in both tables → keep ProgramApplication
    //    (it has the authoritative status set by the company via the program flow)
    const programOfferIdsFromProgramApps = new Set<number>();
    for (const app of normalizedProgramApps) {
      if (app.programOfferId) programOfferIdsFromProgramApps.add(app.programOfferId);
    }
    const uniqueJobApps = normalizedJobApps.filter(
      (app) => !app.programOfferId || !programOfferIdsFromProgramApps.has(app.programOfferId),
    );

    // 6) Merge + sort by appliedAt desc
    const merged = [...uniqueJobApps, ...normalizedProgramApps].sort(
      (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
    );

    const dedupedCount = normalizedJobApps.length - uniqueJobApps.length;
    const combinedTotal = jobTotal + programTotal - dedupedCount;

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getStudentApplications] studentId=%d jobApps=%d programApps=%d deduped=%d merged=%d total=%d',
        studentId, jobApps.length, programApps.length, dedupedCount, merged.length, combinedTotal,
      );
      for (const app of merged) {
        console.log(
          '[DEV:getStudentApplications:app] applicationId=%d source=%s status=%s isProgram=%s offerId=%s',
          app.applicationId, app.source, app.status, String(!!app.programId), app.offerId ?? 'null',
        );
      }
    }

    return {
      applications: merged,
      total: combinedTotal,
      page,
      totalPages: Math.ceil(combinedTotal / limit),
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
    const application = await this.applicationsRepository.findById(id) as any;
    if (!application) {
      throw new Error('Application not found');
    }

    const offer = application.offer;
    if (offer.company.id !== companyId) {
      throw new Error('Unauthorized to update this application');
    }

    return this.applicationsRepository.updateStatus(
      id,
      dto.status,
      application.status
    ).then(async (updatedApp) => {
      // Create notification for student
      const notifConfigs: Record<string, { type: string; title: string; message: string }> = {
        PENDING: { type: 'APPLICATION_PENDING', title: 'Candidatura pendiente', message: `Tu candidatura para "${offer.title}" está pendiente de revisión` },
        INTERVIEW: { type: 'APPLICATION_INTERVIEW', title: 'Seleccionado para entrevista', message: `Has sido seleccionado para entrevista en "${offer.title}"` },
        HIRED: { type: 'APPLICATION_HIRED', title: 'Contratado', message: `Enhorabuena, has sido contratado para "${offer.title}"` },
        REJECTED: { type: 'APPLICATION_REJECTED', title: 'Candidatura rechazada', message: `Tu candidatura para "${offer.title}" ha sido rechazada` },
      };
      const notifConfig = notifConfigs[dto.status as string];
      if (notifConfig) {
        try {
          await prisma.notification.create({
            data: {
              userId: (application as any).student.userId,
              title: notifConfig.title,
              message: notifConfig.message,
              type: notifConfig.type as any,
              relatedId: id,
              metadata: JSON.stringify({
                source: 'job',
                applicationId: id,
                offerId: offer.id,
                jobOfferId: offer.id,
                programOfferId: null,
                programId: null,
                companyId: offer.company.id,
                offerTitle: offer.title,
                status: dto.status,
                previousStatus: application.status,
              }),
            },
          });
          if (process.env.NODE_ENV !== 'production') {
            console.log(
              '[DEV:updateApplicationStatus] companyId=%d applicationId=%d oldStatus=%s newStatus=%s notifiedUserId=%d notificationType=%s',
              companyId, id, application.status, dto.status, (application as any).student.userId, notifConfig.type,
            );
          }
        } catch (notifError) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEV:updateApplicationStatus] notification failed:', notifError);
          }
        }
      }
      return updatedApp;
    });
  }

  async addNote(
    applicationId: number,
    companyId: number,
    dto: CreateNoteDto
  ): Promise<CompanyNote> {
    // Verify application exists and belongs to company
    const application = await this.applicationsRepository.findById(applicationId) as any;
    if (!application) {
      throw new Error('Application not found');
    }

    const offer = application.offer;
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
      const offer = (application as any).offer;
      if (!companyProfile || offer.company.id !== companyProfile.id) {
        throw new Error('Unauthorized to view this timeline');
      }
    }

    return this.applicationsRepository.getTimeline(applicationId);
  }

  async getNotes(applicationId: number, companyId: number): Promise<CompanyNote[]> {
    // Verify application belongs to company
    const application = await this.applicationsRepository.findById(applicationId) as any;
    if (!application) {
      throw new Error('Application not found');
    }

    const offer = application.offer;
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

  async getCanonicalStudentApplications(
    studentId: number,
    filters: GetApplicationsDto,
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const statusFilter = filters.status;

    const [jobApplications, programApplications] = await Promise.all([
      prisma.jobApplication.findMany({
        where: {
          studentId,
          ...(statusFilter ? { status: statusFilter } : {}),
          offer: {
            programOffer: { is: null },
          },
        },
        include: {
          offer: {
            include: {
              company: {
                select: {
                  id: true,
                  companyName: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.programApplication.findMany({
        where: {
          studentId,
          ...(statusFilter ? { status: statusFilter as any } : {}),
        },
        include: {
          offer: {
            include: {
              company: {
                select: {
                  id: true,
                  companyName: true,
                  logoUrl: true,
                },
              },
              program: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      }),
    ]);

    const items = [
      ...jobApplications.map((application) => ({
        applicationId: application.id,
        source: 'job' as const,
        status: application.status,
        appliedAt: application.appliedAt,
        updatedAt: application.updatedAt,
        coverLetter: application.coverLetter ?? null,
        resumeUrl: application.resumeUrl ?? null,
        offer: {
          jobOfferId: application.offer.id,
          programOfferId: null,
          title: application.offer.title,
        },
        program: null,
        company: {
          companyId: application.offer.company.id,
          name: application.offer.company.companyName,
          logoUrl: application.offer.company.logoUrl ?? null,
        },
      })),
      ...programApplications.map((application) => ({
        applicationId: application.id,
        source: 'program' as const,
        status: application.status,
        appliedAt: application.appliedAt,
        updatedAt: application.reviewedAt ?? application.appliedAt,
        coverLetter: application.coverLetter ?? null,
        resumeUrl: application.resumeUrl ?? null,
        offer: {
          jobOfferId: application.offer.jobOfferId ?? null,
          programOfferId: application.offer.id,
          title: application.offer.title,
        },
        program: {
          programId: application.offer.program.id,
          title: application.offer.program.title,
        },
        company: {
          companyId: application.offer.company.id,
          name: application.offer.company.companyName,
          logoUrl: application.offer.company.logoUrl ?? null,
        },
      })),
    ].sort((left, right) => {
      const dateDiff = new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return right.applicationId - left.applicationId;
    });

    const total = items.length;
    const start = (page - 1) * limit;
    const applications = items.slice(start, start + limit);
    const summary = {
      total,
      jobApplications: jobApplications.length,
      programApplications: programApplications.length,
      pendingApplications: items.filter((application) => application.status === 'PENDING').length,
      interviewApplications: items.filter((application) => application.status === 'INTERVIEW').length,
      hiredApplications: items.filter((application) => application.status === 'HIRED').length,
      rejectedApplications: items.filter((application) => application.status === 'REJECTED').length,
    };

    return {
      studentId,
      summary,
      filters: {
        status: statusFilter ?? null,
      },
      meta: {
        hasApplications: total > 0,
        hasJobApplications: jobApplications.length > 0,
        hasProgramApplications: programApplications.length > 0,
        emptyState: total === 0
          ? {
              kind: statusFilter ? 'NO_RESULTS_FOR_FILTER' : 'NO_APPLICATIONS',
              message: statusFilter
                ? `No applications found for status ${statusFilter}.`
                : 'This student has not applied to any offers yet.',
            }
          : null,
      },
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
