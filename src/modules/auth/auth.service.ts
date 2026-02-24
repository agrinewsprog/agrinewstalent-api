import { User, Role } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { UniversitiesRepository } from '../universities/universities.repository';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../common/utils';
import { AuthPayload } from '../../common/middlewares/auth.middleware';
import { RegisterDto, LoginDto } from './auth.dto';
import { prisma } from '../../config/database';

/**
 * Operational / business errors.
 * The controller maps these to 4xx responses.
 * Unexpected errors (not AppError) become 500.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = 'BUSINESS_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthService {
  private authRepository: AuthRepository;
  private universitiesRepository: UniversitiesRepository;

  constructor() {
    this.authRepository = new AuthRepository();
    this.universitiesRepository = new UniversitiesRepository();
  }

  async register(dto: RegisterDto): Promise<{
    user: Omit<User, 'password'>;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if user already exists
    const existingUser = await this.authRepository.findUserByEmail(dto.email);
    if (existingUser) {
      throw new AppError('User already exists with this email', 409, 'EMAIL_IN_USE');
    }

    // Hash password
    const hashedPassword = await hashPassword(dto.password);

    // Create user with profile based on role
    const userData: any = {
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
    };

    // Add profile data based on role
    if (dto.role === Role.STUDENT) {
      // Priority: isStudent > isActiveStudent > default(false)
      const isActiveStudent =
        dto.isStudent !== undefined
          ? dto.isStudent
          : (dto.isActiveStudent ?? false);

      const studentData: any = {
        firstName: dto.firstName!,
        lastName: dto.lastName!,
        isActiveStudent,
      };

      // Safe array defaults — prevents .map() on undefined down the line
      const careers = dto.careers ?? [];
      const species = dto.species ?? [];

      if (dto.phoneNumber)  studentData.phoneNumber  = dto.phoneNumber;
      if (dto.city)         studentData.city         = dto.city;
      if (dto.country)      studentData.country      = dto.country;
      if (dto.resumeUrl)    studentData.resumeUrl    = dto.resumeUrl;
      if (dto.linkedinUrl)  studentData.linkedinUrl  = dto.linkedinUrl;
      if (dto.githubUrl)    studentData.githubUrl    = dto.githubUrl;
      if (dto.bio)          studentData.bio          = dto.bio;
      if (dto.skills)       studentData.skills       = dto.skills;
      if (dto.dateOfBirth)  studentData.dateOfBirth  = dto.dateOfBirth;
      if (dto.careerField)  studentData.careerField  = dto.careerField;
      // Only persist arrays when the Prisma model supports JSON columns
      if (careers.length)   studentData.careers      = careers;
      if (species.length)   studentData.species      = species;

      userData.studentProfile = { create: studentData };

    } else if (dto.role === Role.COMPANY) {
      const companyData: any = {
        companyName: dto.companyName!,
      };

      if (dto.industry)    companyData.industry    = dto.industry;
      if (dto.size)        companyData.size        = dto.size;
      if (dto.website)     companyData.website     = dto.website;
      if (dto.description) companyData.description = dto.description;
      if (dto.logoUrl)     companyData.logoUrl     = dto.logoUrl;
      if (dto.city)        companyData.city        = dto.city;
      if (dto.country)     companyData.country     = dto.country;
      // foundedYear is already coerced to number by Zod transform
      if (dto.foundedYear != null) companyData.foundedYear = dto.foundedYear;
      if (dto.companySize) companyData.companySize = dto.companySize;

      userData.companyProfile = { create: companyData };

    } else if (dto.role === Role.UNIVERSITY) {
      const universityData: any = {
        universityName: dto.universityName!,
      };

      // Safe array defaults — prevents .map() on undefined down the line
      const convenioTypes = dto.convenioTypes ?? [];
      const careers       = dto.careers       ?? [];

      if (dto.city)        universityData.city        = dto.city;
      if (dto.country)     universityData.country     = dto.country;
      if (dto.website)     universityData.website     = dto.website;
      if (dto.description) universityData.description = dto.description;
      if (dto.logoUrl)     universityData.logoUrl     = dto.logoUrl;
      // Only persist arrays when the Prisma model supports JSON columns
      if (convenioTypes.length) universityData.convenioTypes = convenioTypes;
      if (careers.length)       universityData.careers       = careers;

      userData.universityProfile = { create: universityData };
    }

    const user = await this.authRepository.createUser(userData);

    // Handle university invite redemption (only for active students)
    if (dto.role === Role.STUDENT && dto.universityInviteCode) {
      // Determine if student is active
      const isActiveStudent = dto.isStudent !== undefined ? dto.isStudent : (dto.isActiveStudent || false);
      
      if (isActiveStudent) {
        try {
          // Find student profile
          const studentProfile = await prisma.studentProfile.findUnique({
            where: { userId: user.id },
          });

          if (!studentProfile) {
            throw new Error('Student profile not found');
          }

          // Validate and redeem invite code
          const invite = await this.universitiesRepository.findInviteByCode(dto.universityInviteCode);
          
          if (!invite) {
            throw new Error('Invalid invite code');
          }

          // Check if invite is expired
          if (invite.expiresAt && invite.expiresAt < new Date()) {
            throw new Error('Invite code has expired');
          }

          // Check if invite has reached max uses
          if (invite.maxUses !== null && invite.currentUses >= invite.maxUses) {
            throw new Error('Invite code has reached maximum uses');
          }

          // Create university membership
          await prisma.universityMembership.create({
            data: {
              universityId: invite.universityId,
              studentId: studentProfile.id,
              inviteId: invite.id,
              status: 'ACTIVE',
            },
          });

          // Increment invite uses
          await this.universitiesRepository.incrementInviteUses(invite.id);
        } catch (error: any) {
          // Log error but don't fail registration
          console.error('Failed to redeem university invite:', error.message);
          // You can choose to throw or just log depending on requirements
          // For now, we'll log and continue since the user is already created
        }
      }
    }

    // Generate tokens
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Hash before storing — bcrypt hash ≈ 60 chars, fits in VarChar(191).
    // refresh() uses comparePassword(rawToken, storedHash) so MUST be bcrypt.
    const hashedRefreshToken = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.authRepository.saveRefreshToken(user.id, hashedRefreshToken, expiresAt);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<{
    user: Omit<User, 'password'>;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user
    const user = await this.authRepository.findUserByEmail(dto.email);
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (user.status === 'SUSPENDED') {
      throw new AppError('Account is suspended', 403, 'ACCOUNT_SUSPENDED');
    }

    // Generate tokens
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Hash before storing — bcrypt hash ≈ 60 chars, fits in VarChar(191).
    // refresh() uses comparePassword(rawToken, storedHash) so MUST be bcrypt.
    const hashedRefreshToken = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.authRepository.saveRefreshToken(user.id, hashedRefreshToken, expiresAt);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify refresh token
    let payload: AuthPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Find all refresh tokens for user and verify against hashed versions
    const userTokens = await this.authRepository.findUserRefreshTokens(payload.userId);
    
    let validToken = null;
    for (const storedToken of userTokens) {
      const isValid = await comparePassword(refreshToken, storedToken.tokenHash);
      if (isValid) {
        validToken = storedToken;
        break;
      }
    }

    if (!validToken) {
      throw new Error('Refresh token not found');
    }

    // Check if token is expired
    if (validToken.expiresAt < new Date()) {
      await this.authRepository.deleteRefreshTokenById(validToken.id);
      throw new Error('Refresh token expired');
    }

    // Strip JWT-reserved fields (exp, iat) before re-signing.
    // Passing them alongside expiresIn throws: "payload already has exp property".
    const cleanPayload: AuthPayload = {
      userId: payload.userId,
      email:  payload.email,
      role:   payload.role,
    };

    // Generate new tokens
    const newAccessToken  = generateAccessToken(cleanPayload);
    const newRefreshToken = generateRefreshToken(cleanPayload);

    // Delete old refresh token and save new one
    await this.authRepository.deleteRefreshTokenById(validToken.id);
    const hashedNewRefreshToken = await hashPassword(newRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await this.authRepository.saveRefreshToken(
      payload.userId,
      hashedNewRefreshToken,
      expiresAt
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // Find and delete the matching hashed token
    try {
      const payload = verifyRefreshToken(refreshToken);
      const userTokens = await this.authRepository.findUserRefreshTokens(payload.userId);
      
      for (const storedToken of userTokens) {
        const isValid = await comparePassword(refreshToken, storedToken.tokenHash);
        if (isValid) {
          await this.authRepository.deleteRefreshTokenById(storedToken.id);
          break;
        }
      }
    } catch (error) {
      // Token invalid or expired, ignore
    }
  }

  async getCurrentUser(userId: number): Promise<Omit<User, 'password'> | null> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
