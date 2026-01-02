import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service'; // <--- Import MailService
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { v4 as uuidv4 } from 'uuid'; 
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService // <--- Inject MailService
  ) {}

  // 1. INVITE USER (Sends Real Email)
  async invite(createUserDto: CreateUserDto) {
    // Check if email exists
    const existing = await this.prisma.user.findUnique({ where: { email: createUserDto.email } });
    if (existing) throw new BadRequestException('User already exists');

    const token = uuidv4(); 

    // Create user with "INVITED" status, NO password, and Default Auto-Stop
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        role: createUserDto.role || 'EMPLOYEE',
        hourlyRate: createUserDto.hourlyRate || 0,
        status: 'INVITED',
        inviteToken: token,
        autoStopLimit: 5, // Default 5 minutes
      },
    });

    // --- SEND REAL EMAIL ---
    // This calls the MailService to send the invitation link via Resend
    await this.mailService.sendInvite(user.email, user.name || 'New User', token);

    return { message: 'Invitation email sent successfully', user };
  }

  // 2. ACCEPT INVITE
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

  // 3. GET ALL (Returns status and autoStopLimit)
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

  // 4. UPDATE STATUS (Deactivate/Reactivate)
  async updateStatus(id: number, status: 'ACTIVE' | 'DISABLED') {
    return this.prisma.user.update({
      where: { id },
      data: { status }
    });
  }

  // 5. UPDATE SETTINGS (Individual Auto-Stop Limit)
  async updateSettings(id: number, autoStopLimit: number) {
    return this.prisma.user.update({
      where: { id },
      data: { autoStopLimit }
    });
  }

  // 6. UPDATE GLOBAL SETTINGS (Update ALL users)
  async updateGlobalSettings(limit: number) {
    await this.prisma.user.updateMany({
      data: { autoStopLimit: limit }
    });
    return { message: `Updated inactivity limit to ${limit} mins for everyone.` };
  }

  // Standard CRUD
  findOne(id: number) { return this.prisma.user.findUnique({ where: { id } }); }
  update(id: number, updateUserDto: UpdateUserDto) { return this.prisma.user.update({ where: { id }, data: updateUserDto }); }
  remove(id: number) { return this.prisma.user.delete({ where: { id } }); }
}