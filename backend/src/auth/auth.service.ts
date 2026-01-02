import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service'; // <--- IMPORT THIS
import { MailService } from '../mail/mail.service';   // <--- IMPORT THIS
import * as bcrypt from 'bcrypt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, 
    private jwtService: JwtService,
    private usersService: UsersService, // <--- INJECT THIS
    private mailService: MailService    // <--- INJECT THIS
  ) {}

  // 1. REGISTER (Sign Up - For Employer/Owner)
  async register(createAuthDto: CreateAuthDto) {
    const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createAuthDto.email,
        password: hashedPassword,
        role: 'EMPLOYER',
        name: createAuthDto.name,
        status: 'ACTIVE',
        autoStopLimit: 5,
      },
    });

    return { message: 'User created successfully', userId: user.id };
  }

  // 2. LOGIN (Sign In)
  async login(loginAuthDto: LoginAuthDto) {
    const { email, password } = loginAuthDto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials or account not setup');
    }

    // Check Inactive Status
    if (user.status === 'DISABLED') {
      throw new ForbiddenException('Your account has been deactivated. Please contact your administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role, 
      name: user.name 
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        autoStopLimit: user.autoStopLimit
      },
    };
  }

  // 3. FORGOT PASSWORD (Send Email)
  async forgotPassword(email: string) {
    // Check if user exists using UsersService
    const user = await this.usersService.findByEmail(email);
    
    // Security: Do not reveal if email doesn't exist. Just return success.
    if (!user) {
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    // Generate a temporary token valid for 15 minutes
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload, { expiresIn: '15m' });

    // Create the Link (Points to your Frontend)
    const resetLink = `https://sfbtimetracker.com/reset-password?token=${token}`;

    // Send Email
    await this.mailService.sendPasswordReset(user.email, user.name || 'User', resetLink);

    return { message: 'Reset link sent' };
  }

  // 4. RESET PASSWORD (Verify & Update)
  async resetPassword(token: string, newPassword: string) {
    try {
      // Verify the token
      const payload = this.jwtService.verify(token);
      
      // Update the user
      // Note: We pass the raw password because UsersService.update() now handles the hashing
      await this.usersService.update(payload.sub, { password: newPassword });

      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}