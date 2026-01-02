import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // 1. USER REPORT (Stats Breakdown)
  async getUserReport(userId: number, start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    // Ensure we cover the full end day
    endDate.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.timeSession.findMany({
      where: {
        userId: userId,
        startTime: { gte: startDate },
        endTime: { lte: endDate, not: null },
      },
      include: { task: { include: { project: true } } }
    });

    const projectSummary = {};
    const taskSummary = {};

    sessions.forEach(session => {
      if (!session.endTime) return;
      
      // CALCULATION LOGIC
      const grossDuration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      
      // FIX: Use 'idleDuration' (database field), not 'idleTime'
      const idle = session.idleDuration || 0; 
      
      const netDuration = Math.max(0, grossDuration - idle); 
      const isManual = session.isManual;

      // Helper to aggregate
      const addToSummary = (summaryObj, key) => {
        if (!summaryObj[key]) {
            summaryObj[key] = { 
                name: key, 
                trackedSeconds: 0, 
                manualSeconds: 0, 
                idleSeconds: 0, 
                totalSeconds: 0 
            };
        }
        
        summaryObj[key].totalSeconds += grossDuration;
        summaryObj[key].idleSeconds += idle;

        if (isManual) {
            summaryObj[key].manualSeconds += grossDuration;
        } else {
            summaryObj[key].trackedSeconds += netDuration;
        }
      };

      if (session.task?.project) addToSummary(projectSummary, session.task.project.name);
      if (session.task) addToSummary(taskSummary, session.task.name);
    });

    return {
      projects: Object.values(projectSummary),
      tasks: Object.values(taskSummary),
    };
  }

  // 2. PROJECT REPORT
  async getProjectReport(projectId: number, start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.timeSession.findMany({
      where: {
        task: { projectId: projectId }, 
        startTime: { gte: startDate },
        endTime: { lte: endDate, not: null },
      },
      include: {
        task: true, 
        user: true, 
      }
    });

    const taskSummary: Record<string, number> = {};
    const userSummary: Record<string, number> = {};

    sessions.forEach(session => {
      if (!session.endTime) return;
      const duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;

      const taskName = session.task.name;
      if (!taskSummary[taskName]) taskSummary[taskName] = 0;
      taskSummary[taskName] += duration;

      const userName = session.user.name || 'Unknown User';
      if (!userSummary[userName]) userSummary[userName] = 0;
      userSummary[userName] += duration;
    });

    return {
      tasks: Object.entries(taskSummary).map(([name, seconds]) => ({ name, seconds })),
      users: Object.entries(userSummary).map(([name, seconds]) => ({ name, seconds })),
    };
  }

  // 3. TIMESHEET REPORT (With Notes & Midnight Logic)
  async getTimesheet(userId: number, start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.timeSession.findMany({
      where: {
        userId: userId,
        startTime: { gte: startDate },
        endTime: { lte: endDate, not: null }
      },
      orderBy: { startTime: 'asc' },
      include: {
        task: { include: { project: true } }, // Include Project Name
        user: true
      }
    });

    const processedRows: any[] = [];

    sessions.forEach(session => {
      if (!session.endTime) return;

      const sTime = new Date(session.startTime);
      const eTime = new Date(session.endTime);
      const notes = session.notes || ''; // <--- CAPTURE NOTES

      // Check if it crosses midnight
      if (sTime.getDate() !== eTime.getDate()) {
        
        // --- ENTRY 1: Start to Midnight ---
        const midnight = new Date(sTime);
        midnight.setHours(23, 59, 59, 999);
        
        processedRows.push({
          id: session.id,
          date: sTime.toISOString().split('T')[0],
          in: sTime.toISOString(),
          out: midnight.toISOString(),
          duration: (midnight.getTime() - sTime.getTime()) / 1000,
          notes: notes + ' (Part 1)', // <--- ADD NOTES
          task: session.task,
          user: session.user
        });

        // --- ENTRY 2: Midnight to End ---
        const morning = new Date(eTime);
        morning.setHours(0, 0, 0, 0);

        processedRows.push({
          id: session.id,
          date: eTime.toISOString().split('T')[0],
          in: morning.toISOString(),
          out: eTime.toISOString(),
          duration: (eTime.getTime() - morning.getTime()) / 1000,
          notes: notes + ' (Part 2)', // <--- ADD NOTES
          task: session.task,
          user: session.user
        });

      } else {
        // Normal Session
        processedRows.push({
          id: session.id,
          date: sTime.toISOString().split('T')[0],
          in: sTime.toISOString(),
          out: eTime.toISOString(),
          duration: (eTime.getTime() - sTime.getTime()) / 1000,
          notes: notes, // <--- ADD NOTES
          task: session.task,
          user: session.user
        });
      }
    });

    return processedRows;
  }

  // 4. TIMELINE REPORT
  async getUserTimeline(userId: number, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.timeSession.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay, 
        }
      },
      include: {
        task: { 
          include: { 
            project: true 
          } 
        }, 
        screenshots: true 
      },
      orderBy: { startTime: 'asc' }
    });
  }

  // 5. PAYROLL REPORT
  async getPayrollReport(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const users = await this.prisma.user.findMany({
      select: { id: true, name: true, email: true, hourlyRate: true, role: true }
    });

    const payrollData = await Promise.all(users.map(async (user) => {
      const sessions = await this.prisma.timeSession.findMany({
        where: {
          userId: user.id,
          startTime: { gte: startDate },
          endTime: { lte: endDate, not: null }
        }
      });

      let totalSeconds = 0;
      sessions.forEach(s => {
        if(s.endTime) {
          totalSeconds += (s.endTime.getTime() - s.startTime.getTime()) / 1000;
        }
      });

      return {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email,
        role: user.role, 
        totalSeconds: totalSeconds,
        hourlyRate: Number(user.hourlyRate) || 0 
      };
    }));

    return payrollData;
  }

  // 6. DAILY OVERVIEW
  async getDailyTimeline(date: string) {
    const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);

    const users = await this.prisma.user.findMany({
      select: { id: true, name: true, role: true }
    });

    const overviewData = await Promise.all(users.map(async (user) => {
      const sessions = await this.prisma.timeSession.findMany({
        where: {
          userId: user.id,
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay }
        },
        include: { task: true },
        orderBy: { startTime: 'asc' }
      });

      let totalSeconds = 0;
      sessions.forEach(s => {
        if (!s.endTime) return;
        totalSeconds += (s.endTime.getTime() - s.startTime.getTime()) / 1000;
      });

      const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
      const lastTaskName = lastSession ? lastSession.task.name : 'No Activity';

      return {
        user,
        sessions,
        totalSeconds,
        lastTaskName
      };
    }));

    return overviewData;
  }

  // 7. EMPLOYEE HISTORY
  async getEmployeeHistory(userId: number, start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.timeSession.findMany({
      where: {
        userId: userId,
        startTime: { gte: startDate },
        endTime: { lte: endDate }
      },
      orderBy: { startTime: 'asc' }
    });

    const grouped: Record<string, { date: string, sessions: any[], totalSeconds: number }> = {};
    
    sessions.forEach(session => {
      const dateKey = session.startTime.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, sessions: [], totalSeconds: 0 };
      }

      grouped[dateKey].sessions.push(session);
      
      if (session.endTime) {
        grouped[dateKey].totalSeconds += (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      }
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }

  // 8. DASHBOARD STATS
  async getUserStats(userId: number) {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    const startOfWeek = new Date(now.setDate(diff)); startOfWeek.setHours(0,0,0,0);

    const sessions = await this.prisma.timeSession.findMany({
      where: {
        userId: userId,
        startTime: { gte: startOfWeek },
        endTime: { not: null }
      }
    });

    let dayTotal = 0;
    let weekTotal = 0;

    sessions.forEach(s => {
      if (!s.endTime) return;
      const duration = (s.endTime.getTime() - s.startTime.getTime()) / 1000;
      weekTotal += duration;
      if (s.startTime >= startOfDay) {
        dayTotal += duration;
      }
    });

    return { day: dayTotal, week: weekTotal };
  }

  // 9. SAVE SCREENSHOT
  async saveScreenshot(data: { timeSessionId: number, imageUrl: string, capturedAt: string }) {
    return this.prisma.screenshot.create({
      data: {
        timeSessionId: data.timeSessionId,
        imageUrl: data.imageUrl,
        capturedAt: data.capturedAt
      }
    });
  }

  // 10. SUMMARY
  async getSummary(start: string, end: string, userId?: number) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const whereClause: any = {
      startTime: { gte: startDate },
      endTime: { lte: endDate, not: null }
    };

    if (userId) whereClause.userId = userId;

    const sessions = await this.prisma.timeSession.findMany({
      where: whereClause,
      include: {
        user: true,
        task: { include: { project: true } }
      }
    });

    const empMap: Record<number, any> = {};
    const projMap: Record<number, any> = {};
    const taskMap: Record<number, any> = {};

    sessions.forEach(session => {
      if (!session.endTime) return;
      const duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      const isManual = session.isManual === true;

      // Employee Stats
      const uId = session.userId;
      if (!empMap[uId]) {
        empMap[uId] = { 
          id: uId, 
          name: session.user.name, 
          totalSeconds: 0, 
          manualSeconds: 0, 
          activePct: 0 
        };
      }
      empMap[uId].totalSeconds += duration;
      if (isManual) empMap[uId].manualSeconds += duration;

      // Project Stats
      if (session.task?.project) {
        const pId = session.task.projectId;
        if (!projMap[pId]) {
          projMap[pId] = { 
            id: pId, 
            name: session.task.project.name, 
            totalSeconds: 0, 
            manualSeconds: 0 
          };
        }
        projMap[pId].totalSeconds += duration;
        if (isManual) projMap[pId].manualSeconds += duration;
      }

      // Task Stats
      if (session.task) {
        const tId = session.task.id;
        if (!taskMap[tId]) {
          taskMap[tId] = { 
            id: tId, 
            name: session.task.name, 
            projectName: session.task.project?.name || 'No Project',
            totalSeconds: 0, 
            manualSeconds: 0 
          };
        }
        taskMap[tId].totalSeconds += duration;
        if (isManual) taskMap[tId].manualSeconds += duration;
      }
    });

    return {
      employees: Object.values(empMap),
      projects: Object.values(projMap),
      tasks: Object.values(taskMap)
    };
  }
}