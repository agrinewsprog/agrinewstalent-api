import { AgreementsRepository } from './agreements.repository';
import { CreateAgreementDto, UpdateAgreementStatusDto, ListAgreementsDto } from './agreements.dto';

export class AgreementsService {
  private agreementsRepository: AgreementsRepository;

  constructor() {
    this.agreementsRepository = new AgreementsRepository();
  }

  // ============================================================
  // CREATE AGREEMENT
  // ============================================================

  async createAgreement(dto: CreateAgreementDto, creatorRole: string, creatorProfileId: number) {
    // Validate dates
    if (dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);

      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
    }

    // Check if agreement already exists
    const exists = await this.agreementsRepository.existsByUniversityAndCompany(
      dto.universityId,
      dto.companyId
    );

    if (exists) {
      throw new Error('An active agreement already exists between this university and company');
    }

    // Validate creator is part of the agreement
    if (creatorRole === 'UNIVERSITY' && dto.universityId !== creatorProfileId) {
      throw new Error('Unauthorized to create agreement for this university');
    }

    if (creatorRole === 'COMPANY' && dto.companyId !== creatorProfileId) {
      throw new Error('Unauthorized to create agreement for this company');
    }

    const agreement = await this.agreementsRepository.create(dto);

    return {
      message: 'Agreement created successfully',
      agreement,
    };
  }

  // ============================================================
  // LIST AGREEMENTS
  // ============================================================

  async listAgreements(dto: ListAgreementsDto) {
    const { page = 1, limit = 20, status, universityId, companyId } = dto;
    const skip = (page - 1) * limit;

    const { agreements, total } = await this.agreementsRepository.findAll(
      skip,
      limit,
      status,
      universityId,
      companyId
    );

    return {
      agreements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // GET AGREEMENT BY ID
  // ============================================================

  async getAgreementById(id: number) {
    const agreement = await this.agreementsRepository.findById(id);

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    return agreement;
  }

  // ============================================================
  // UPDATE AGREEMENT STATUS
  // ============================================================

  async updateAgreementStatus(
    id: number,
    dto: UpdateAgreementStatusDto,
    userRole: string,
    userProfileId: number
  ) {
    const agreement = await this.agreementsRepository.findById(id);

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Only university or company involved can update status
    const isUniversity = userRole === 'UNIVERSITY' && agreement.universityId === userProfileId;
    const isCompany = userRole === 'COMPANY' && agreement.companyId === userProfileId;

    if (!isUniversity && !isCompany) {
      throw new Error('Unauthorized to update this agreement');
    }

    const updatedAgreement = await this.agreementsRepository.updateStatus(id, dto.status);

    return {
      message: `Agreement status updated to ${dto.status}`,
      agreement: updatedAgreement,
    };
  }

  // ============================================================
  // DELETE AGREEMENT
  // ============================================================

  async deleteAgreement(id: number, userRole: string, userProfileId: number) {
    const agreement = await this.agreementsRepository.findById(id);

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Only university or company involved can delete
    const isUniversity = userRole === 'UNIVERSITY' && agreement.universityId === userProfileId;
    const isCompany = userRole === 'COMPANY' && agreement.companyId === userProfileId;

    if (!isUniversity && !isCompany) {
      throw new Error('Unauthorized to delete this agreement');
    }

    await this.agreementsRepository.delete(id);

    return {
      message: 'Agreement deleted successfully',
    };
  }

  // ============================================================
  // GET MY AGREEMENTS
  // ============================================================

  async getMyAgreements(userRole: string, profileId: number) {
    let universityId: number | undefined;
    let companyId: number | undefined;

    if (userRole === 'UNIVERSITY') {
      universityId = profileId;
    } else if (userRole === 'COMPANY') {
      companyId = profileId;
    } else {
      throw new Error('Only universities and companies can have agreements');
    }

    const { agreements } = await this.agreementsRepository.findAll(
      0,
      1000,
      undefined,
      universityId,
      companyId
    );

    return {
      agreements,
      total: agreements.length,
    };
  }
}
