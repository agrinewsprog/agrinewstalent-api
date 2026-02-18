import { User, UserRole } from '@prisma/client';
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
    if (dto.role === UserRole.STUDENT && dto.firstName && dto.lastName) {
      userData.studentProfile = {
        create: {
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      };
    } else if (dto.role === UserRole.COMPANY && dto.companyName) {
      userData.companyProfile = {
        create: {
          companyName: dto.companyName,
        },
      };
    } else if (dto.role === UserRole.UNIVERSITY && dto.universityName) {
      userData.universityProfile = {
        create: {
          universityName: dto.universityName,
        },
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
    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
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

    // Check if refresh token exists in database
    const storedToken = await this.authRepository.findRefreshToken(refreshToken);
    if (!storedToken) {
      throw new Error('Refresh token not found');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await this.authRepository.deleteRefreshToken(refreshToken);
      throw new Error('Refresh token expired');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Delete old refresh token and save new one
    await this.authRepository.deleteRefreshToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await this.authRepository.saveRefreshToken(
      payload.userId,
      newRefreshToken,
      expiresAt
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.authRepository.deleteRefreshToken(refreshToken);
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
