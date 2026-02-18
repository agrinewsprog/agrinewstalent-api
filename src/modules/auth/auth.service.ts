import { User, Role } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../common/utils';
import { AuthPayload } from '../../common/middlewares/auth.middleware';
import { RegisterDto, LoginDto } from './auth.dto';

export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  async register(dto: RegisterDto): Promise<{
    user: Omit<User, 'password'>;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if user already exists
    const existingUser = await this.authRepository.findUserByEmail(dto.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
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
      const studentData: any = {
        firstName: dto.firstName!,
        lastName: dto.lastName!,
      };

      // Add optional fields if provided
      if (dto.phoneNumber) studentData.phoneNumber = dto.phoneNumber;
      if (dto.city) studentData.city = dto.city;
      if (dto.country) studentData.country = dto.country;
      if (dto.resumeUrl) studentData.resumeUrl = dto.resumeUrl;
      if (dto.linkedinUrl) studentData.linkedinUrl = dto.linkedinUrl;
      if (dto.githubUrl) studentData.githubUrl = dto.githubUrl;
      if (dto.bio) studentData.bio = dto.bio;
      if (dto.skills) studentData.skills = dto.skills;
      if (dto.dateOfBirth) studentData.dateOfBirth = dto.dateOfBirth;
      if (dto.careerField) studentData.careerField = dto.careerField;

      userData.studentProfile = {
        create: studentData,
      };
    } else if (dto.role === Role.COMPANY) {
      const companyData: any = {
        companyName: dto.companyName!,
      };

      // Add optional fields if provided
      if (dto.industry) companyData.industry = dto.industry;
      if (dto.size) companyData.size = dto.size;
      if (dto.website) companyData.website = dto.website;
      if (dto.description) companyData.description = dto.description;
      if (dto.logoUrl) companyData.logoUrl = dto.logoUrl;
      if (dto.city) companyData.city = dto.city;
      if (dto.country) companyData.country = dto.country;
      if (dto.foundedYear) companyData.foundedYear = dto.foundedYear;
      if (dto.companySize) companyData.companySize = dto.companySize;

      userData.companyProfile = {
        create: companyData,
      };
    } else if (dto.role === Role.UNIVERSITY) {
      const universityData: any = {
        universityName: dto.universityName!,
      };

      // Add optional fields if provided
      if (dto.city) universityData.city = dto.city;
      if (dto.country) universityData.country = dto.country;
      if (dto.website) universityData.website = dto.website;
      if (dto.description) universityData.description = dto.description;
      if (dto.logoUrl) universityData.logoUrl = dto.logoUrl;

      userData.universityProfile = {
        create: universityData,
      };
    }

    const user = await this.authRepository.createUser(userData);

    // Generate tokens
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await this.authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

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
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (user.status === 'SUSPENDED') {
      throw new Error('Account is not active');
    }

    // Generate tokens
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await this.authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

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

    // Generate new tokens
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

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
