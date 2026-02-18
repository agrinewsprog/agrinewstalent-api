import { ProgramsRepository, ProgramFilters, ApplicationFilters } from './programs.repository';
import {
  CreateProgramDto,
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

  // PROGRAM MANAGEMENT
  async createProgram(universityId: number, dto: CreateProgramDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    const program = await this.programsRepository.createProgram({
      universityId,
      title: dto.title,
      description: dto.description,
      startDate,
      endDate,
      requiresCourseId: dto.requiresCourseId,
      maxStudents: dto.maxStudents,
    });

    return program;
  }

  async getProgramById(id: number) {
    const program = await this.programsRepository.findProgramById(id);
    if (!program) {
      throw new Error('Program not found');
    }
    return program;
  }

  async getUniversityPrograms(universityId: number, dto: GetProgramsDto) {
    const filters: ProgramFilters = {
      universityId,
      isActive: dto.isActive,
    };

    const pagination = {
      page: dto.page || 1,
      limit: Math.min(dto.limit || 20, 100),
    };

    const { programs, total } = await this.programsRepository.findProgramsByUniversity(
      filters,
      pagination
    );

    return {
      programs,
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  // COMPANY INTEREST
  async showInterest(programId: number, companyId: number, _dto: ShowInterestDto) {
    // Verify program exists and is active
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    if (!program.isActive) {
      throw new Error('Program is not active');
    }

    // Check if company already showed interest
    const existingInterest = await this.programsRepository.findCompanyInterest(
      programId,
      companyId
    );

    if (existingInterest) {
      throw new Error('Company has already shown interest in this program');
    }

    const interest = await this.programsRepository.createCompanyInterest(
      programId,
      companyId
    );

    return interest;
  }

  async updateCompanyStatus(
    programId: number,
    companyId: number,
    universityUserId: number,
    dto: UpdateCompanyStatusDto
  ) {
    // Verify program belongs to university
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    if (program.university.userId !== universityUserId) {
      throw new Error('Unauthorized to manage this program');
    }

    // Verify company interest exists
    const interest = await this.programsRepository.findCompanyInterest(
      programId,
      companyId
    );

    if (!interest) {
      throw new Error('Company interest not found');
    }

    if (interest.status !== 'PENDING') {
      throw new Error('Company interest has already been reviewed');
    }

    const updated = await this.programsRepository.updateCompanyStatus(
      programId,
      companyId,
      dto.status,
      universityUserId
    );

    return updated;
  }

  async getProgramCompanies(programId: number) {
    return this.programsRepository.getProgramCompanies(programId);
  }

  // PROGRAM OFFERS
  async createProgramOffer(
    programId: number,
    companyId: number,
    dto: CreateProgramOfferDto
  ) {
    // Verify program exists
    const program = await this.programsRepository.findProgramById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    // Verify company is approved for this program
    const companyInterest = await this.programsRepository.findCompanyInterest(
      programId,
      companyId
    );

    if (!companyInterest) {
      throw new Error('Company has not shown interest in this program');
    }

    if (companyInterest.status !== 'APPROVED') {
      throw new Error('Company is not approved for this program');
    }

    const offer = await this.programsRepository.createProgramOffer({
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

    return offer;
  }

  async updateOfferStatus(
    programId: number,
    offerId: number,
    universityUserId: number,
    dto: UpdateOfferStatusDto
  ) {
    // Verify offer exists
    const offer = await this.programsRepository.findProgramOfferById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    // Verify offer belongs to the program
    if (offer.program.id !== programId) {
      throw new Error('Offer does not belong to this program');
    }

    // Verify university owns the program
    if (offer.program.university.userId !== universityUserId) {
      throw new Error('Unauthorized to manage this program');
    }

    // Can only approve/reject offers in PENDING_APPROVAL status
    if (offer.status !== 'PENDING_APPROVAL') {
      throw new Error('Only offers in PENDING_APPROVAL status can be reviewed');
    }

    const updated = await this.programsRepository.updateOfferStatus(
      offerId,
      dto.status,
      universityUserId
    );

    return updated;
  }

  async getProgramOffers(programId: number) {
    return this.programsRepository.getProgramOffers(programId);
  }

  async getCompanyProgramOffers(companyId: number, programId?: number) {
    return this.programsRepository.getCompanyProgramOffers(companyId, programId);
  }

  // PROGRAM APPLICATIONS
  async applyToProgramOffer(
    offerId: number,
    studentId: number,
    dto: ApplyToProgramOfferDto
  ) {
    // Verify offer exists and is approved
    const offer = await this.programsRepository.findProgramOfferById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status !== 'APPROVED') {
      throw new Error('Cannot apply to unapproved offer');
    }

    // Verify student belongs to the program's university
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        universityMembership: true,
      },
    });

    if (!studentProfile) {
      throw new Error('Student profile not found');
    }

    if (!studentProfile.universityMembership) {
      throw new Error('Student does not belong to any university');
    }

    if (studentProfile.universityMembership.universityId !== offer.program.universityId) {
      throw new Error('Student does not belong to the program\'s university');
    }

    if (studentProfile.universityMembership.status !== 'ACTIVE') {
      throw new Error('Student membership is not active');
    }

    // Validate CourseCompletion if required (placeholder for future implementation)
    if (offer.program.requiresCourseId) {
      // TODO: Validate that student has completed the required course
      // For now, we'll just log a warning
      console.warn(`Program requires course ${offer.program.requiresCourseId}, validation pending`);
    }

    // Check if student has already applied
    const existingApplication = await this.programsRepository.findApplicationByOfferAndStudent(
      offerId,
      studentId
    );

    if (existingApplication) {
      throw new Error('You have already applied to this offer');
    }

    // Check max applicants limit
    if (offer.maxApplicants) {
      const currentApplications = await this.programsRepository.countApplicationsByOffer(offerId);
      if (currentApplications >= offer.maxApplicants) {
        throw new Error('This offer has reached the maximum number of applicants');
      }
    }

    const application = await this.programsRepository.createApplication({
      offerId,
      studentId,
      coverLetter: dto.coverLetter,
      resumeUrl: dto.resumeUrl,
    });

    return application;
  }

  async getStudentProgramApplications(
    studentId: number,
    dto: GetProgramApplicationsDto
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

    const { applications, total } = await this.programsRepository.getStudentApplications(
      filters,
      pagination
    );

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

  async getOfferApplications(offerId: number, companyId: number) {
    // Verify offer belongs to company
    const offer = await this.programsRepository.findProgramOfferById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.company.id !== companyId) {
      throw new Error('Unauthorized to view applications for this offer');
    }

    return this.programsRepository.getOfferApplications(offerId);
  }

  // HELPER METHODS
  async getUniversityIdFromUserId(userId: number): Promise<number> {
    const universityProfile = await prisma.universityProfile.findUnique({
      where: { userId },
    });

    if (!universityProfile) {
      throw new Error('University profile not found');
    }

    return universityProfile.id;
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
