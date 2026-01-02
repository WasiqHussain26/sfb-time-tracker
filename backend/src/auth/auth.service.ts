import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  // 1. REGISTER (Sign Up - For Employer/Owner)
  async register(createAuthDto: CreateAuthDto) {
    // Hash the password so it's secure
    const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);

    // Create user in DB
    const user = await this.prisma.user.create({
      data: {
        email: createAuthDto.email,
        password: hashedPassword,
        role: 'EMPLOYER', // First user is always an Employer (Owner)
        name: createAuthDto.name,
        status: 'ACTIVE', // Default status for owner
        autoStopLimit: 5, // Default setting
      },
    });

    return { message: 'User created successfully', userId: user.id };
  }

  // 2. LOGIN (Sign In)
  async login(loginAuthDto: LoginAuthDto) {
    const { email, password } = loginAuthDto;

    // 1. Find User
    const user = await this.prisma.user.findUnique({ where: { email } });

    // 2. Check if user exists AND has a password
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials or account not setup');
    }

    // --- NEW: INACTIVE CHECK ---
    // If the user was deactivated by the employer, block access immediately.
    if (user.status === 'DISABLED') {
      throw new ForbiddenException('Your account has been deactivated. Please contact your administrator.');
    }

    // 3. Check Password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Generate Token
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role, 
      name: user.name 
    };

    // 5. Return Token & User Data (including the autoStopLimit settings)
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        autoStopLimit: user.autoStopLimit // <--- Sending this to Desktop App!
      },
    };
  }
}