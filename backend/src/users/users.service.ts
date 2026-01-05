import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service'; 
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { randomUUID } from 'crypto'; 
import * as bcrypt from 'bcrypt';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  // 1. CREATE OWNER
  async create(createUserDto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ 
      where: { email: createUserDto.email } 
    });

    if (existing) throw new ConflictException('User already exists');

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        role: createUserDto.role || 'EMPLOYEE',
        status: 'ACTIVE',
        autoStopLimit: 5,
        lastActive: new Date(),
      },
    });
  }

  // 2. INVITE USER
  async invite(createUserDto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ 
      where: { email: createUserDto.email } 
    });
    
    if (existing) throw new BadRequestException('User already exists');

    const token = randomUUID(); 

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

    try {
        await this.mailService.sendInvite(user.email, user.name || 'New User', token);
    } catch (error) {
        console.error("Failed to send email:", error);
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
        autoStopLimit: true,
        lastActive: true
      }
    });
  }

  // 5. FIND ONE (By Email)
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

  // Helpers
  findOne(id: number) { return this.prisma.user.findUnique({ where: { id } }); }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    return this.prisma.user.update({ where: { id }, data: updateUserDto });
  }

  async remove(id: number) {
    const sessions = await this.prisma.timeSession.findMany({
      where: { userId: id },
      select: { id: true }
    });
    
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length > 0) {
      await this.prisma.screenshot.deleteMany({
        where: { timeSessionId: { in: sessionIds } }
      });
      await this.prisma.timeSession.deleteMany({
        where: { userId: id }
      });
    }
    return this.prisma.user.delete({ where: { id } });
  }

  // --- NEW METHODS ---

  // PING: Heartbeat to update lastActive
  async ping(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { lastActive: new Date() },
      select: { id: true, status: true, autoStopLimit: true } 
    });
  }

  // CRON JOB: Clean up stale sessions
  // Checks every 5 minutes for users who haven't pinged in 6+ minutes
  @Cron('0 */5 * * * *') 
  async handleStaleSessions() {
    const staleThreshold = new Date(Date.now() - 6 * 60 * 1000); // 6 mins ago

    // Find users with active sessions AND who haven't been active recently
    const staleSessions = await this.prisma.timeSession.findMany({
        where: {
            endTime: null,
            user: {
                lastActive: { lt: staleThreshold }
            }
        },
        include: { user: true }
    });

    if (staleSessions.length > 0) {
        console.log(`🧹 Cleaning up ${staleSessions.length} stale sessions...`);

        for (const session of staleSessions) {
            // Use the user's lastActive time as the end time (or session start if it's weirdly older)
            // Fallback: If lastActive is somehow before startTime, use startTime (0 duration)
            let endTime = session.user.lastActive;
            if (endTime < session.startTime) endTime = new Date(); // Should rarely happen, just safe guard

            const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

            await this.prisma.timeSession.update({
                where: { id: session.id },
                data: {
                    endTime: endTime,
                    duration: duration > 0 ? duration : 0,
                    notes: (session.notes || "") + "\n[System: Auto-stopped due to shutdown/offline]"
                }
            });
        }
    }
  }
}