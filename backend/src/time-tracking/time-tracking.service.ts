import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeTrackingService {
  constructor(private prisma: PrismaService) {}

  // 1. START TIMER
  async startSession(userId: number, taskId: number) {
    // A. Check if user already has a running timer
    const activeSession = await this.prisma.timeSession.findFirst({
      where: { userId: userId, endTime: null }
    });

    if (activeSession) {
      throw new BadRequestException('You already have a timer running! Stop it first.');
    }

    // B. SECURITY CHECK: Is user allowed to work on this task?
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: true }
    });

    if (!task) throw new NotFoundException('Task not found');

    // Logic: Allowed if Task is "Open To All" OR User is in "Assignees" list
    const isAssigned = task.assignees.some(u => u.id === userId);
    
    if (!task.isOpenToAll && !isAssigned) {
      throw new BadRequestException('You are not assigned to this task.');
    }

    // C. Create Session
    return this.prisma.timeSession.create({
      data: {
        userId: userId,
        taskId: taskId,
        startTime: new Date(),
      },
      include: { task: { include: { project: true } } }
    });
  }

  // 2. STOP TIMER (Updated with Idle Time)
  async stopSession(userId: number, idleTime: number, notes?: string) {
    // 1. Find active session
    const activeSession = await this.prisma.timeSession.findFirst({
      where: { userId, endTime: null },
    });

    if (!activeSession) {
      throw new BadRequestException('No active session found');
    }

    const endTime = new Date();
    const startTime = new Date(activeSession.startTime);
    
    // Calculate total duration in seconds
    let totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const finalDuration = Math.max(0, totalSeconds - (idleTime || 0));

    // 2. Update Session
    return this.prisma.timeSession.update({
      where: { id: activeSession.id },
      data: {
        endTime,
        duration: finalDuration,
        idleDuration: idleTime || 0,
        notes: notes || null, 
      },
    });
  }

  // 3. GET CURRENT STATUS (Is the user working right now?)
  async getActiveSession(userId: number) {
    return this.prisma.timeSession.findFirst({
      where: { 
        userId: userId, 
        endTime: null 
      },
      include: { 
        task: { include: { project: true } } 
      }
    });
  }

  // 4. ADD MANUAL SESSION
  async addManualSession(data: { userId: number, taskId: number, startTime: string, endTime: string }) {
    // SECURITY CHECK: Is user allowed to work on this task?
    const task = await this.prisma.task.findUnique({
      where: { id: data.taskId },
      include: { assignees: true }
    });

    if (!task) throw new NotFoundException('Task not found');

    const isAssigned = task.assignees.some(u => u.id === data.userId);
    
    if (!task.isOpenToAll && !isAssigned) {
      throw new BadRequestException('This user is not assigned to the selected task.');
    }

    return this.prisma.timeSession.create({
      data: {
        userId: data.userId,
        taskId: data.taskId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        
        // FIX: Must use 'idleDuration' to match schema, NOT 'idleTime'
        idleDuration: 0, 
        
        isManual: true 
      }
    });
  }

  // 5. DELETE SESSION (FIXED: Cascade Delete)
  async deleteSession(sessionId: number, requestingUserId: number) {
    const session = await this.prisma.timeSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) throw new NotFoundException('Session not found');

    // PERMISSION LOGIC
    const requester = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
    
    const isOwner = session.userId === requestingUserId;
    const isManager = requester?.role === 'EMPLOYER' || requester?.role === 'ADMIN';

    if (!isOwner && !isManager) {
        throw new BadRequestException('You do not have permission to delete this entry.');
    }

    // --- FIX: Delete Screenshots First ---
    await this.prisma.screenshot.deleteMany({
      where: { timeSessionId: sessionId }
    });

    // --- Then Delete Session ---
    return this.prisma.timeSession.delete({
      where: { id: sessionId }
    });
  }
}