import { CompaniesRepository, CandidatesFilters, PaginationOptions } from './companies.repository';
import { ListCandidatesDto } from './companies.dto';

export class CompaniesService {
  private companiesRepository: CompaniesRepository;

  constructor() {
    this.companiesRepository = new CompaniesRepository();
  }

  // ============================================================
  // LIST MY CANDIDATES
  // ============================================================

  async listMyCandidates(companyId: number, dto: ListCandidatesDto) {
    const filters: CandidatesFilters = {};
    
    if (dto.status) {
      filters.status = dto.status;
    }

    if (dto.offerId) {
      filters.offerId = dto.offerId;
    }

    if (dto.search) {
      filters.search = dto.search;
    }

    const pagination: PaginationOptions = {
      page: dto.page || 1,
      limit: dto.limit || 10,
    };

    const result = await this.companiesRepository.findCompanyCandidates(
      companyId,
      filters,
      pagination
    );

    return {
      candidates: result.applications,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    };
  }

  // ============================================================
  // GET CANDIDATE BY ID
  // ============================================================

  async getCandidateById(applicationId: number, companyId: number) {
    const candidate = await this.companiesRepository.findCandidateById(
      applicationId,
      companyId
    );

    if (!candidate) {
      throw new Error('Candidate not found or you do not have access to this application');
    }

    return candidate;
  }

  // ============================================================
  // GET CANDIDATE STATISTICS
  // ============================================================

  async getMyCandidateStats(companyId: number) {
    return this.companiesRepository.getCandidateStats(companyId);
  }
}
