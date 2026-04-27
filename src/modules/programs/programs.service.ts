import { ProgramsRepository, ProgramFilters, ApplicationFilters } from './programs.repository';
import {
  CreateProgramDto,
  UpdateProgramDto,
  ShowInterestDto,
  UpdateCompanyStatusDto,
  CreateProgramOfferDto,
  UpdateOfferStatusDto,
  ApplyToProgramOfferDto,
  GetProgramsDto,
  GetProgramApplicationsDto,
} from './programs.dto';
import { prisma } from '../../config/database';

export class ProgramsService {
  private programsRepository: ProgramsRepository;

  constructor() {
    this.programsRepository = new ProgramsRepository();
  }

  // ── PROGRAM CRUD ──────────────────────────────────────────────────
  async createProgram(universityId: number, dto: CreateProgramDto) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:createProgram] universityId=%d dto=%j', universityId, dto);
    }

    // startDate/endDate son opcionales en el DTO; pasar null si no llegan
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    // Validate dates only if both are provided
    if (startDate && endDate && endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Map frontend 'status' to Prisma 'isActive' boolean
    const isActive = dto.status === 'CLOSED' ? false : true;

    const created = await this.programsRepository.createProgram({
      universityId,
      title: dto.title,
      description: dto.description,
      rules: dto.rules,
      startDate,
      endDate,
      isActive,
      requiresCourseId: dto.requiresCourseId,
      maxStudents: dto.maxStudents,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:createProgram] persisted OK: id=%d title=%s universityId=%d', created?.id, created?.title, universityId);
    }

    return created;
  }

  async getProgramById(id: number, ownerUniversityId?: number) {
    const program = await this.programsRepository.findProgramById(id);
    if (!program) {
      throw new Error('Program not found');
    }
    if (ownerUniversityId !== undefined && program.universityId !== ownerUniversityId) {
      throw new Error('Unauthorized: program does not belong to your university');
    }
    return program;
  }

  async getCanonicalUniversityProgramDetail(programId: number, universityId: number) {
    const [program, companies, offersResult, applicationsResult] = await Promise.all([
      this.getProgramById(programId, universityId),
      this.getProgramCompanies(programId, universityId),
      this.getProgramOffersForUniversity(programId, universityId),
      this.getProgramApplicationsForUniversity(programId, universityId, { page: 1, limit: 100 }),
    ]);
    const offers = offersResult.offers;

    return {
      programId: program.id,
      universityId: program.universityId,
      title: program.title,
      description: program.description ?? null,
      rules: program.rules ?? null,
      startDate: program.startDate,
      endDate: program.endDate,
      status: program.status,
      requiresCourseId: program.requiresCourseId ?? null,
      maxStudents: program.maxStudents ?? null,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
      metrics: {
        companiesCount: companies.length,
        approvedCompaniesCount: companies.length,
        offersCount: offers.length,
        applicationsCount: applicationsResult.pagination.total,
      },
      companies,
      offers,
      applications: applicationsResult.applications,
      meta: {
        hasCompanies: companies.length > 0,
        hasOffers: offers.length > 0,
        hasApplications: applicationsResult.pagination.total > 0,
        hasPublishedProgramOffers: offers.length > 0,
        offers: offersResult.meta,
        emptyState: offers.length === 0
          ? {
              kind: 'NO_PROGRAM_OFFERS',
              message: 'This program does not have published offers yet.',
            }
          : null,
      },
    };
  }

  async updateProgram(id: number, universityId: number, dto: UpdateProgramDto) {
    // Verify ownership
    const existing = await this.programsRepository.findProgramById(id);
    if (!existing) throw new Error('Program not found');
    if (existing.universityId !== universityId) {
      throw new Error('Unauthorized: program does not belong to your university');
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.rules !== undefined) updateData.rules = dto.rules;
    if (dto.requiresCourseId !== undefined) updateData.requiresCourseId = dto.requiresCourseId;
    if (dto.maxStudents !== undefined) updateData.maxStudents = dto.maxStudents;
    if (dto.status !== undefined) updateData.isActive = dto.status === 'ACTIVE';

    if (dto.startDate !== undefined) {
      updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    // Validate dates only if both are non-null
    const finalStart = updateData.startDate !== undefined ? updateData.startDate : existing.startDate;
    const finalEnd = updateData.endDate !== undefined ? updateData.endDate : existing.endDate;
    if (finalStart && finalEnd && new Date(finalEnd) <= new Date(finalStart)) {
      throw new Error('End date must be after start date');
    }

    return this.programsRepository.updateProgram(id, updateData);
  }

  async deleteProgram(id: number, universityId: number) {
    const program = await this.programsRepository.findRawProgramById(id);
    if (!program) throw new Error('Program not found');
    if (program.universityId !== universityId) {
      throw new Error('Program not found');
    }
    await this.programsRepository.deleteProgram(id);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:deleteProgram] deleted programId=%d universityId=%d', id, universityId);
    }
    return id;
  }

  async getUniversityPrograms(universityId: number, dto: GetProgramsDto) {
    const filters: ProgramFilters = { universityId };

    // support both ?status=ACTIVE|CLOSED and legacy ?isActive=true|false
    if (dto.status !== undefined) {
      filters.isActive = dto.status === 'ACTIVE';
    } else if (dto.isActive !== undefined) {
      filters.isActive = dto.isActive;
    }

    const pagination = {
      page: dto.page || 1,
      limit: Math.min(dto.limit || 20, 100),
    };

    const { programs, total } =
      await this.programsRepository.findProgramsByUniversity(filters, pagination);

    return {
      programs,
      filters: {
        status: dto.status ?? null,
      },
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
      meta: {
        hasPrograms: programs.length > 0,
        emptyState: programs.length === 0
          ? {
              kind: 'NO_PROGRAMS',
              message: 'No programs match the selected filters.',
            }
          : null,
      },
    };
  }

  // ── COMPANY: list active programs ────────────────────────────────
  async getActiveProgramsForCompany(dto: GetProgramsDto) {
    const pagination = {
      page: dto.page || 1,
      limit: Math.min(dto.limit || 20, 100),
    };
    const { programs, total } =
      await this.programsRepository.findActivePrograms(pagination);
    return {
      programs,
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
      meta: {
        hasPrograms: programs.length > 0,
        emptyState: programs.length === 0
          ? {
              kind: 'NO_ACTIVE_PROGRAMS',
              message: 'There are no active programs available right now.',
            }
          : null,
      },
    };
  }

  // ── STUDENT: list active programs of their university ─────────────
  async getActiveProgramsForStudent(userId: number, dto: GetProgramsDto) {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: { universityMembership: true },
    });
    if (!studentProfile) throw new Error('Student profile not found');
    if (
      !studentProfile.universityMembership ||
      studentProfile.universityMembership.status !== 'ACTIVE'
    ) {
      // No linked university → empty list
      return {
        programs: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        meta: {
          hasPrograms: false,
          isLinkedToUniversity: false,
          emptyState: {
            kind: 'NO_UNIVERSITY_LINK',
            message: 'This student is not linked to an active university yet.',
          },
        },
      };
    }
    const universityId = studentProfile.universityMembership.universityId;
    const pagination = {
      page: dto.page || 1,
      limit: Math.min(dto.limit || 20, 100),
    };
    const { programs, total } =
      await this.programsRepository.findActiveProgramsByUniversity(
        universityId,
        pagination,
      );

    // Add isEnrolled flag for each program
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        studentId: studentProfile.id,
        programId: { in: programs.map((p: any) => p.id) },
      },
      select: { programId: true, enrolledAt: true },
    });
    const enrollmentMap = new Map(enrollments.map((e) => [e.programId, e.enrolledAt]));

    const enrichedPrograms = programs.map((p: any) => ({
      ...p,
      isEnrolled: enrollmentMap.has(p.id),
      enrolledAt: enrollmentMap.get(p.id) ?? null,
    }));

    return {
      programs: enrichedPrograms,
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
      meta: {
        hasPrograms: enrichedPrograms.length > 0,
        isLinkedToUniversity: true,
        hasEnrolledPrograms: enrichedPrograms.some((program: any) => program.isEnrolled),
        emptyState: enrichedPrograms.length === 0
          ? {
              kind: 'NO_ACTIVE_PROGRAMS',
              message: 'There are no active programs for this university right now.',
            }
          : null,
      },
    };
  }

  // ── ROLE-AWARE: program detail ───────────────────────────────────
  async getProgramDetailForRole(
    programId: number,
    role: string,
    userId: number,
  ) {
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) throw new Error('Program not found');

    if (role === 'UNIVERSITY') {
      const universityId = await this.getUniversityIdFromUserId(userId);
      if (program.universityId !== universityId) {
        throw new Error('Program not found');
      }
      return program;
    }

    if (role === 'COMPANY') {
      if (program.status !== 'ACTIVE') {
        throw new Error('Program not found');
      }
      const companyId = await this.getCompanyIdFromUserId(userId);
      const myOffers = await this.programsRepository.getCompanyProgramOffers(companyId, programId);
      return {
        ...program,
        myProgramOffers: myOffers.map((o: any) => ({
          programOfferId: o.id,
          jobOfferId: o.jobOfferId ?? null,
          title: o.title,
          status: o.status,
          createdAt: o.createdAt,
          applicationsCount: o._count?.applications ?? 0,
        })),
      };
    }

    if (role === 'STUDENT') {
      if (program.status !== 'ACTIVE') {
        throw new Error('Program not found');
      }
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId },
        include: { universityMembership: true },
      });
      if (!studentProfile) throw new Error('Student profile not found');
      if (
        !studentProfile.universityMembership ||
        studentProfile.universityMembership.universityId !== program.universityId ||
        studentProfile.universityMembership.status !== 'ACTIVE'
      ) {
        throw new Error('Program not found');
      }
      return program;
    }

    // SUPER_ADMIN or others: return as-is
    return program;
  }

  // ── PROGRAM COMPANIES ────────────────────────────────────────────
  async showInterest(programId: number, companyId: number, _dto: ShowInterestDto) {
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) throw new Error('Program not found');
    if (program.status !== 'ACTIVE') throw new Error('Program is not active');

    const existing = await this.programsRepository.findCompanyInterest(
      programId,
      companyId,
    );
    if (existing) throw new Error('Company has already shown interest in this program');

    return this.programsRepository.createCompanyInterest(programId, companyId);
  }

  async updateCompanyStatus(
    programId: number,
    companyId: number,
    universityUserId: number,
    dto: UpdateCompanyStatusDto,
  ) {
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) throw new Error('Program not found');
    if (program.university?.userId !== universityUserId) {
      throw new Error('Unauthorized to manage this program');
    }

    const interest = await this.programsRepository.findCompanyInterest(
      programId,
      companyId,
    );
    if (!interest) throw new Error('Company interest not found');

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:updateCompanyStatus] programId=%d companyId=%d oldStatus=%s newStatus=%s',
        programId,
        companyId,
        interest.status,
        dto.status,
      );
    }

    return this.programsRepository.updateCompanyStatus(
      programId,
      companyId,
      dto.status,
      universityUserId,
    );
  }

  async getProgramCompanyDetail(
    programId: number,
    companyId: number,
    universityId: number,
  ) {
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) throw new Error('Program not found');
    if (program.universityId !== universityId) {
      throw new Error('Unauthorized: program does not belong to your university');
    }
    const detail = await this.programsRepository.getProgramCompanyDetail(programId, companyId);
    if (!detail) throw new Error('Company not found in this program');

    // Fetch all ProgramOffer for this company across this university's programs
    const programOffers = await this.programsRepository.getCompanyOffersForUniversity(
      companyId,
      universityId,
    );

    // Build offers
    const offers = programOffers.map((po: any) => ({
      programOfferId: po.id,
      jobOfferId: po.jobOfferId ?? null,
      programId: po.programId,
      programTitle: po.program?.title ?? null,
      title: po.jobOffer?.title ?? po.title,
      description: po.description ?? null,
      location: po.location ?? null,
      contractType: po.contractType ?? null,
      workMode: po.workMode ?? null,
      status: po.status,
      createdAt: po.createdAt,
    }));

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getProgramCompanyDetail] programId=%d companyId=%d universityId=%d offers=%d',
        programId, companyId, universityId, offers.length,
      );
    }

    return { ...detail, _offers: offers };
  }

  async getProgramCompanies(programId: number, universityId?: number) {
    if (universityId !== undefined) {
      const program = await this.programsRepository.findProgramById(programId);
      if (!program) throw new Error('Program not found');
      if (program.universityId !== universityId) {
        throw new Error('Unauthorized: program does not belong to your university');
      }
    }

    // Build list from APPROVED ProgramOffers, deduplicated by company
    const approvedOffers = await this.programsRepository.getApprovedCompaniesForProgram(programId);

    const companyMap = new Map<number, {
      companyId: number;
      name: string;
      logoUrl: string | null;
      location: string | null;
      description: string | null;
      verified: boolean;
      approvedOffersCount: number;
      latestApprovedOfferAt: Date;
      industry: string | null;
      website: string | null;
      profileUrl: string;
    }>();

    for (const o of approvedOffers) {
      const existing = companyMap.get(o.companyId);
      if (existing) {
        existing.approvedOffersCount++;
        if (o.createdAt > existing.latestApprovedOfferAt) {
          existing.latestApprovedOfferAt = o.createdAt;
        }
      } else {
        const city = o.company.city ?? null;
        const country = o.company.country ?? null;
        const location = [city, country].filter(Boolean).join(', ') || null;
        const verified = o.company.user?.status === 'ACTIVE';

        companyMap.set(o.companyId, {
          companyId: o.companyId,
          name: o.company.companyName,
          logoUrl: o.company.logoUrl ?? null,
          location,
          description: o.company.description ?? null,
          verified,
          approvedOffersCount: 1,
          latestApprovedOfferAt: o.createdAt,
          industry: o.company.industry ?? null,
          website: o.company.website ?? null,
          profileUrl: `/api/companies/${o.companyId}`,
        });
      }
    }

    const companies = Array.from(companyMap.values()).sort(
      (a, b) => b.latestApprovedOfferAt.getTime() - a.latestApprovedOfferAt.getTime(),
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getProgramCompanies] programId=%d approvedOffers=%d uniqueCompanies=%d',
        programId, approvedOffers.length, companies.length,
      );
    }

    return companies;
  }

  // ── PROGRAM OFFERS ───────────────────────────────────────────────
  async createProgramOffer(
    programId: number,
    companyId: number,
    dto: CreateProgramOfferDto,
  ) {
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) throw new Error('Program not found');

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:createProgramOffer] programId=%d companyId=%d title=%s',
        programId,
        companyId,
        dto.title,
      );
    }

    const { jobOffer, programOffer } =
      await this.programsRepository.createProgramOfferWithJobOffer({
        programId,
        companyId,
        title: dto.title,
        description: dto.description,
        requirements: dto.requirements,
        location: dto.location,
        salary: dto.salary,
        workMode: dto.workMode,
        contractType: dto.contractType,
        experienceLevel: dto.experienceLevel,
        maxApplicants: dto.maxApplicants,
      });

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:createProgramOffer] jobOffer.id=%d programOffer.id=%d jobOfferId=%d status=%s',
        jobOffer.id,
        programOffer.id,
        programOffer.jobOfferId,
        programOffer.status,
      );
    }

    return { jobOffer, programOffer };
  }

  private serializeCompanyProgramOffer(row: any) {
    return {
      programOfferId: row.id,
      programId: row.programId,
      jobOfferId: row.jobOfferId ?? null,
      companyId: row.companyId,
      title: row.title,
      description: row.description,
      requirements: row.requirements ?? null,
      location: row.location ?? null,
      salary: row.salary ?? null,
      workMode: row.workMode ?? null,
      contractType: row.contractType ?? null,
      experienceLevel: row.experienceLevel ?? null,
      maxApplicants: row.maxApplicants ?? null,
      status: row.status,
      createdAt: row.createdAt,
      approvedAt: row.approvedAt ?? null,
      applicationsCount: row._count?.applications ?? 0,
      program: {
        programId: row.programId,
        title: row.program?.title ?? null,
      },
      university: {
        name: row.program?.university?.universityName ?? null,
      },
      meta: {
        hasApplications: (row._count?.applications ?? 0) > 0,
        canReview: row.status === 'PENDING',
      },
    };
  }

  async updateOfferStatus(
    programId: number,
    offerId: number,
    universityUserId: number,
    dto: UpdateOfferStatusDto,
  ) {
    const offer = await this.programsRepository.findProgramOfferById(offerId);
    if (!offer) throw new Error('Offer not found');
    if (offer.program.id !== programId) {
      throw new Error('Offer does not belong to this program');
    }
    if (offer.program.university.userId !== universityUserId) {
      throw new Error('Unauthorized to manage this program');
    }
    // Transitions: PENDING→APPROVED|REJECTED, APPROVED→REJECTED, REJECTED→APPROVED
    if (offer.status === dto.status) {
      throw new Error(`Offer is already in ${dto.status} status`);
    }
    if (offer.status === 'PENDING' && dto.status !== 'APPROVED' && dto.status !== 'REJECTED') {
      throw new Error('Pending offers can only be approved or rejected');
    }
    if (offer.status === 'APPROVED' && dto.status !== 'REJECTED') {
      throw new Error('Approved offers can only be rejected');
    }
    if (offer.status === 'REJECTED' && dto.status !== 'APPROVED') {
      throw new Error('Rejected offers can only be approved');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:updateOfferStatus] programId=%d offerId=%d oldStatus=%s newStatus=%s by userId=%d',
        programId, offerId, offer.status, dto.status, universityUserId,
      );
    }

    return this.programsRepository.updateOfferStatus(offerId, dto.status, universityUserId);
  }

  async getProgramOffers(programId: number) {
    return this.programsRepository.getProgramOffers(programId);
  }

  async getProgramOffersForUniversity(programId: number, universityId: number) {
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) throw new Error('Program not found');
    if (program.universityId !== universityId) {
      throw new Error('Unauthorized: program does not belong to your university');
    }
    const rows = await this.programsRepository.getProgramOffers(programId);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getProgramOffersForUniversity] universityId=%d programId=%d count=%d', universityId, programId, rows.length);
    }

    const offers = rows.map((o: any) => ({
      programOfferId: o.id,
      programId: o.programId,
      jobOfferId: o.jobOfferId ?? null,
      title: o.title,
      description: o.description,
      companyId: o.companyId,
      companyName: o.company?.companyName ?? null,
      companyLogoUrl: o.company?.logoUrl ?? null,
      location: o.location ?? null,
      contractType: o.contractType ?? null,
      workMode: o.workMode ?? null,
      status: o.status,
      createdAt: o.createdAt,
      applicationsCount: o._count?.applications ?? 0,
    }));

    return {
      offers,
      meta: {
        totalOffers: offers.length,
        hasOffers: offers.length > 0,
        hasApplications: offers.some((offer) => offer.applicationsCount > 0),
        emptyState: offers.length === 0
          ? {
              kind: 'NO_PROGRAM_OFFERS',
              message: 'This program does not have offers yet.',
            }
          : null,
      },
    };
  }

  async getProgramOfferDetailForUniversity(
    programId: number,
    programOfferId: number,
    universityId: number,
  ) {
    const offer = await this.programsRepository.findProgramOfferById(programOfferId);
    if (!offer) throw new Error('Offer not found');
    if (offer.program.id !== programId) {
      throw new Error('Offer does not belong to this program');
    }
    if (offer.program.universityId !== universityId) {
      throw new Error('Unauthorized: program does not belong to your university');
    }
    return {
      programOfferId: offer.id,
      programId: offer.program.id,
      jobOfferId: offer.jobOfferId ?? null,
      title: offer.title,
      description: offer.description ?? null,
      requirements: offer.requirements ?? null,
      location: offer.location ?? null,
      salary: offer.salary ?? null,
      workMode: offer.workMode ?? null,
      contractType: offer.contractType ?? null,
      experienceLevel: offer.experienceLevel ?? null,
      maxApplicants: offer.maxApplicants ?? null,
      status: offer.status,
      createdAt: offer.createdAt,
      approvedAt: offer.approvedAt ?? null,
      applicationsCount: offer._count?.applications ?? 0,
      program: {
        programId: offer.program.id,
        title: offer.program.title,
        universityId: offer.program.universityId,
      },
      company: {
        companyId: offer.company.id,
        name: offer.company.companyName,
        logoUrl: offer.company.logoUrl ?? null,
        industry: offer.company.industry ?? null,
      },
      meta: {
        hasApplications: (offer._count?.applications ?? 0) > 0,
        canReview: offer.status === 'PENDING',
      },
    };
  }

  async getCompanyProgramOffers(companyId: number, programId?: number) {
    const rows = await this.programsRepository.getCompanyProgramOffers(companyId, programId);
    const offers = rows.map((row: any) => this.serializeCompanyProgramOffer(row));

    return {
      offers,
      meta: {
        totalOffers: offers.length,
        hasOffers: offers.length > 0,
        hasApprovedOffers: offers.some((offer) => offer.status === 'APPROVED'),
        hasApplications: offers.some((offer) => offer.applicationsCount > 0),
        emptyState: offers.length === 0
          ? {
              kind: 'NO_PROGRAM_OFFERS',
              message: 'This company has not created program offers yet.',
            }
          : null,
      },
    };
  }

  // ── PROGRAM APPLICATIONS ─────────────────────────────────────────
  async applyToProgramOffer(
    offerId: number,
    studentId: number,
    dto: ApplyToProgramOfferDto,
  ) {
    const offer = await this.programsRepository.findProgramOfferById(offerId);
    if (!offer) throw new Error('Offer not found');
    if (offer.status !== 'APPROVED') throw new Error('Cannot apply to unapproved offer');

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { universityMembership: true },
    });
    if (!studentProfile) throw new Error('Student profile not found');
    if (!studentProfile.universityMembership) {
      throw new Error('Student does not belong to any university');
    }
    if (studentProfile.universityMembership.universityId !== offer.program.universityId) {
      throw new Error("Student does not belong to the program's university");
    }
    if (studentProfile.universityMembership.status !== 'ACTIVE') {
      throw new Error('Student membership is not active');
    }

    const existingApplication =
      await this.programsRepository.findApplicationByOfferAndStudent(offerId, studentId);
    if (existingApplication) throw new Error('You have already applied to this offer');

    if (offer.maxApplicants) {
      const current = await this.programsRepository.countApplicationsByOffer(offerId);
      if (current >= offer.maxApplicants) {
        throw new Error('This offer has reached the maximum number of applicants');
      }
    }

    return this.programsRepository.createApplication({
      offerId,
      studentId,
      coverLetter: dto.coverLetter,
      resumeUrl: dto.resumeUrl,
    });
  }

  async getStudentProgramApplications(
    studentId: number,
    dto: GetProgramApplicationsDto,
  ) {
    const filters: ApplicationFilters = {
      studentId,
      status: dto.status,
      offerId: dto.offerId,
    };
    const pagination = {
      page: dto.page || 1,
      limit: Math.min(dto.limit || 20, 100),
    };
    const { applications, total } =
      await this.programsRepository.getStudentApplications(filters, pagination);
    return {
      applications,
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async getProgramApplicationsForUniversity(
    programId: number,
    universityId: number,
    dto: GetProgramApplicationsDto,
  ) {
    // Verify ownership
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) throw new Error('Program not found');
    if (program.universityId !== universityId) {
      throw new Error('Unauthorized: program does not belong to your university');
    }

    const filters: ApplicationFilters = {
      status: dto.status,
      offerId: dto.offerId,
    };
    const pagination = {
      page: dto.page || 1,
      limit: Math.min(dto.limit || 20, 100),
    };
    const { applications, total } =
      await this.programsRepository.getProgramApplicationsForUniversity(
        programId,
        filters,
        pagination,
      );

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getProgramApplicationsForUniversity] programId=%d universityId=%d total=%d returnedIds=%j filters=%j',
        programId,
        universityId,
        total,
        applications.map((a: any) => a.id),
        filters,
      );
    }

    const formattedApplications = applications.map((a: any) => ({
      applicationId: a.id,
      source: 'program' as const,
      status: a.status,
      appliedAt: a.appliedAt,
      updatedAt: a.reviewedAt ?? a.appliedAt,
      coverLetter: a.coverLetter ?? null,
      candidate: {
        studentId: a.student?.id ?? a.studentId,
        userId: a.student?.userId ?? null,
        fullName: [a.student?.firstName, a.student?.lastName].filter(Boolean).join(' ') || null,
        email: a.student?.user?.email ?? null,
        avatarUrl: a.student?.avatarUrl ?? null,
        careerField: a.student?.careerField ?? null,
        resumeUrl: a.student?.resumeUrl ?? null,
        linkedinUrl: a.student?.linkedinUrl ?? null,
        location: [a.student?.city, a.student?.country].filter(Boolean).join(', ') || null,
      },
      offer: {
        programOfferId: a.offer?.id ?? a.offerId,
        jobOfferId: a.offer?.jobOfferId ?? null,
        title: a.offer?.title ?? null,
      },
      company: {
        companyId: a.offer?.companyId ?? a.offer?.company?.id ?? null,
        name: a.offer?.company?.companyName ?? null,
        logoUrl: a.offer?.company?.logoUrl ?? null,
      },
      program: {
        programId,
      },
    }));

    return {
      programId,
      applications: formattedApplications,
      filters: {
        status: dto.status ?? null,
        offerId: dto.offerId ?? null,
      },
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
      meta: {
        hasApplications: formattedApplications.length > 0,
        emptyState: formattedApplications.length === 0
          ? {
              kind: dto.status || dto.offerId ? 'NO_FILTERED_APPLICATIONS' : 'NO_APPLICATIONS',
              message: dto.status || dto.offerId
                ? 'No applications match the selected filters.'
                : 'This program does not have applications yet.',
            }
          : null,
      },
    };
  }

  async getOfferApplications(offerId: number, companyId: number) {
    const offer = await this.programsRepository.findProgramOfferById(offerId);
    if (!offer) throw new Error('Offer not found');
    if (offer.company.id !== companyId) {
      throw new Error('Unauthorized to view applications for this offer');
    }
    return this.programsRepository.getOfferApplications(offerId);
  }

  // ── HELPER METHODS ───────────────────────────────────────────────
  async getUniversityIdFromUserId(userId: number): Promise<number> {
    const universityProfile = await prisma.universityProfile.findUnique({
      where: { userId },
    });
    if (!universityProfile) throw new Error('University profile not found');
    return universityProfile.id;
  }

  async getCompanyIdFromUserId(userId: number): Promise<number> {
    const companyProfile = await prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!companyProfile) throw new Error('Company profile not found');
    return companyProfile.id;
  }

  async getStudentIdFromUserId(userId: number): Promise<number> {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!studentProfile) throw new Error('Student profile not found');
    return studentProfile.id;
  }
}
