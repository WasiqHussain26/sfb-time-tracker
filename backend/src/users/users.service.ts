import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service'; 
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { randomUUID } from 'crypto'; // Native Node.js crypto (No extra library needed)
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  // 1. CREATE OWNER (Used by /auth/register)
  // This was missing in your previous code, which is why Owner setup might fail
  async create(createUserDto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ 
      where: { email: createUserDto.email } 
    });

    if (existing) throw new ConflictException('User already exists');

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        role: createUserDto.role || 'EMPLOYEE',
        status: 'ACTIVE', // Owner is active immediately
        autoStopLimit: 5,
      },
    });
  }

  // 2. INVITE USER (Sends Real Email via Resend)
  async invite(createUserDto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ 
      where: { email: createUserDto.email } 
    });
    
    if (existing) throw new BadRequestException('User already exists');

    const token = randomUUID(); 

    // Create user with "INVITED" status
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        role: createUserDto.role || 'EMPLOYEE',
        hourlyRate: createUserDto.hourlyRate || 0,
        status: 'INVITED',
        inviteToken: token,
        autoStopLimit: 5,
      },
    });

    // Send Email
    try {
        await this.mailService.sendInvite(user.email, user.name || 'New User', token);
    } catch (error) {
        console.error("Failed to send email:", error);
        // We don't stop the process, but we log the error
    }

    return { message: 'Invitation email sent successfully', user };
  }

  // 3. ACCEPT INVITE
  async acceptInvite(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { inviteToken: token, status: 'INVITED' }
    });

    if (!user) throw new BadRequestException("Invalid or expired invite token");

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        status: 'ACTIVE',
        inviteToken: null,
      }
    });
  }

  // 4. GET ALL
  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        hourlyRate: true, 
        status: true,
        autoStopLimit: true 
      }
    });
  }

  // 5. FIND ONE (By Email) - Helper for Auth
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // 6. UPDATE STATUS
  async updateStatus(id: number, status: 'ACTIVE' | 'DISABLED') {
    return this.prisma.user.update({
      where: { id },
      data: { status }
    });
  }

  // 7. UPDATE SETTINGS
  async updateSettings(id: number, autoStopLimit: number) {
    return this.prisma.user.update({
      where: { id },
      data: { autoStopLimit }
    });
  }

  // 8. UPDATE GLOBAL SETTINGS
  async updateGlobalSettings(limit: number) {
    await this.prisma.user.updateMany({
      data: { autoStopLimit: limit }
    });
    return { message: `Updated inactivity limit to ${limit} mins for everyone.` };
  }

  // Standard Helpers
  findOne(id: number) { return this.prisma.user.findUnique({ where: { id } }); }
  update(id: number, updateUserDto: UpdateUserDto) { return this.prisma.user.update({ where: { id }, data: updateUserDto }); }
  remove(id: number) { return this.prisma.user.delete({ where: { id } }); }
}