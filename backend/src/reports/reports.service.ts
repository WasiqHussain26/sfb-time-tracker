import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) { }

  // "3:00 AM PKT" is roughly 22:00 UTC the previous day (if no DST).
  // Or simply run at 22:00 UTC every day.
  // Cron format: Second Minute Hour Day Month DayOfWeek
  @Cron('0 0 22 * * *')
  async handleDailyReports() {
    this.logger.log('Started Daily Report Generation...');

    // 1. Define Time Ranges
    // 'Yesterday' relative to 3 AM PKT is technically the day that just ended 3 hours ago.
    // Let's assume we want the full previous calendar day.
    const yesterday = subDays(new Date(), 1);
    const dayStart = startOfDay(yesterday);
    const dayEnd = endOfDay(yesterday);

    // Last 7 days
    const weekStart = subDays(yesterday, 6); // 6 days ago + yesterday = 7 days

    this.logger.log(`Generating reports for: ${format(dayStart, 'yyyy-MM-dd')}`);

    // 2. Fetch Active Users
    const users = await this.prisma.user.findMany({
      where: { status: { not: 'DISABLED' } },
      select: { id: true, email: true, name: true, role: true }
    });

    let globalAdminReport = '';

    for (const user of users) {
      // A. Calculate Daily Stats
      const dailySessions = await this.prisma.timeSession.findMany({
        where: { userId: user.id, startTime: { gte: dayStart, lte: dayEnd } },
        include: { task: { include: { project: true } } }
      });

      const dayTotalSeconds = dailySessions.reduce((acc, s) => {
        const end = s.endTime ? new Date(s.endTime).getTime() : new Date().getTime();
        const start = new Date(s.startTime).getTime();
        return acc + Math.floor((end - start) / 1000);
      }, 0);

      // B. Calculate Weekly Stats
      const weeklySessions = await this.prisma.timeSession.findMany({
        where: { userId: user.id, startTime: { gte: weekStart, lte: dayEnd } }
      });
      const weekTotalSeconds = weeklySessions.reduce((acc, s) => {
        const end = s.endTime ? new Date(s.endTime).getTime() : new Date().getTime();
        const start = new Date(s.startTime).getTime();
        return acc + Math.floor((end - start) / 1000);
      }, 0);

      const dayHours = (dayTotalSeconds / 3600).toFixed(1);
      const weekHours = (weekTotalSeconds / 3600).toFixed(1);

      // C. Generate Employee Email Content
      const dayHtml = `
        <p><strong>Total Time:</strong> ${dayHours} hours</p>
        <ul>
          ${dailySessions.length > 0 ? dailySessions.map(s => `<li>${s.task?.project?.name} - ${s.task?.name} (${((new Date(s.endTime || new Date()).getTime() - new Date(s.startTime).getTime()) / 1000 / 60).toFixed(0)}m)</li>`).join('') : '<li>No activity recorded.</li>'}
        </ul>
      `;

      const weekHtml = `<p><strong>Total Last 7 Days:</strong> ${weekHours} hours</p>`;

      // Send to Employee
      if (user.role !== 'EMPLOYER') { // Employer usually just wants the summary
        await this.mailService.sendEmployeeReport(user.email, user.name || 'User', dayHtml, weekHtml);
      }

      // Add to Admin Report
      globalAdminReport += `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
           <h3 style="margin: 0; color: #2563eb;">${user.name || 'User'}</h3>
           <p style="margin: 5px 0 0; color: #666; font-size: 14px;"><strong>${dayHours}h</strong> today | <strong>${weekHours}h</strong> this week</p>
        </div>
      `;
    }

    // 3. Send Summary to Admins/Employers
    const admins = users.filter(u => u.role === 'EMPLOYER' || u.role === 'ADMIN');
    for (const admin of admins) {
      await this.mailService.sendAdminReport(admin.email, admin.name || 'User', globalAdminReport);
    }

    this.logger.log('Daily Reports Sent Successfully.');
  }
  // --- REPORTING METHODS ---

  async getUserReport(userId: number, start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Ensure accurate full-day inclusion
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.timeSession.findMany({
      where: { userId, startTime: { gte: startDate, lte: endDate } },
      include: { task: { include: { project: true } } }
    });

    const projectMap = new Map<string, { tracked: number, manual: number }>();
    const taskMap = new Map<string, { tracked: number, manual: number }>();

    sessions.forEach(s => {
      const duration = (s.endTime ? new Date(s.endTime).getTime() : new Date().getTime()) - new Date(s.startTime).getTime();
      const seconds = Math.floor(duration / 1000);

      const isManual = s.isManual;
      const projName = s.task?.project?.name || 'Unassigned';
      const taskName = s.task?.name || 'Unknown Task';

      // Project Stats
      if (!projectMap.has(projName)) projectMap.set(projName, { tracked: 0, manual: 0 });
      const pStat = projectMap.get(projName)!;
      if (isManual) pStat.manual += seconds; else pStat.tracked += seconds;

      // Task Stats
      if (!taskMap.has(taskName)) taskMap.set(taskName, { tracked: 0, manual: 0 });
      const tStat = taskMap.get(taskName)!;
      if (isManual) tStat.manual += seconds; else tStat.tracked += seconds;
    });

    const projects = Array.from(projectMap.entries()).map(([name, stats]) => ({
      name,
      trackedSeconds: stats.tracked,
      manualSeconds: stats.manual,
      totalSeconds: stats.tracked + stats.manual
    })).sort((a, b) => b.totalSeconds - a.totalSeconds);

    const tasks = Array.from(taskMap.entries()).map(([name, stats]) => ({
      name,
      trackedSeconds: stats.tracked,
      manualSeconds: stats.manual,
      totalSeconds: stats.tracked + stats.manual
    })).sort((a, b) => b.totalSeconds - a.totalSeconds);

    return { projects, tasks };
  }

  async getProjectReport(projectId: number, start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.timeSession.findMany({
      where: { task: { projectId }, startTime: { gte: startDate, lte: endDate } },
      include: { user: true, task: true }
    });

    const taskMap = new Map<number, { name: string, seconds: number }>();
    const userMap = new Map<number, { name: string, seconds: number }>();

    sessions.forEach(s => {
      const duration = (s.endTime ? new Date(s.endTime).getTime() : new Date().getTime()) - new Date(s.startTime).getTime();
      const seconds = Math.floor(duration / 1000);

      // Task Stats
      if (!taskMap.has(s.taskId)) taskMap.set(s.taskId, { name: s.task.name, seconds: 0 });
      taskMap.get(s.taskId)!.seconds += seconds;

      // User Stats
      if (!userMap.has(s.userId)) userMap.set(s.userId, { name: s.user.name || 'Unknown', seconds: 0 });
      userMap.get(s.userId)!.seconds += seconds;
    });

    const tasks = Array.from(taskMap.values()).sort((a, b) => b.seconds - a.seconds);
    const users = Array.from(userMap.values()).sort((a, b) => b.seconds - a.seconds);

    return { tasks, users };
  }

  async getTimesheet(userId: number, start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.timeSession.findMany({
      where: { userId, startTime: { gte: startDate, lte: endDate } },
      include: { task: { include: { project: true } } },
      orderBy: { startTime: 'desc' }
    });

    return sessions.map(s => {
      const startTime = new Date(s.startTime);
      const endTime = s.endTime ? new Date(s.endTime) : new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      return {
        id: s.id,
        date: format(startTime, 'yyyy-MM-dd'),
        in: s.startTime,
        out: s.endTime || new Date(),
        duration: duration,
        notes: s.notes || '',
        taskName: s.task?.name,
        projectName: s.task?.project?.name,
        isManual: s.isManual
      };
    });
  }

  async getUserTimeline(userId: number, date: string) {
    const start = startOfDay(new Date(date));
    const end = endOfDay(new Date(date));

    return this.prisma.timeSession.findMany({
      where: { userId, startTime: { gte: start, lte: end } },
      orderBy: { startTime: 'asc' },
      include: {
        task: { include: { project: true } },
        screenshots: { orderBy: { capturedAt: 'asc' } }
      }
    });
  }

  async getPayrollReport(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const users = await this.prisma.user.findMany({
      include: {
        timeSessions: {
          where: { startTime: { gte: startDate, lte: endDate } }
        }
      }
    });

    return users.map(u => {
      const totalSeconds = u.timeSessions.reduce((acc, s) => {
        const duration = (s.endTime ? new Date(s.endTime).getTime() : new Date().getTime()) - new Date(s.startTime).getTime();
        return acc + Math.floor(duration / 1000);
      }, 0);

      return {
        id: u.id,
        name: u.name || 'Unknown',
        role: u.role,
        email: u.email,
        totalSeconds: totalSeconds,
        hourlyRate: Number(u.hourlyRate) || 0
      };
    });
  }

  async getDailyTimeline(date: string) {
    const start = startOfDay(new Date(date));
    const end = endOfDay(new Date(date));

    const sessions = await this.prisma.timeSession.findMany({
      where: { startTime: { gte: start, lte: end } },
      include: { user: true, task: { include: { project: true } } },
      orderBy: { startTime: 'asc' }
    });

    // Group by User
    const userMap = new Map<number, any>();

    sessions.forEach(s => {
      const duration = (s.endTime ? new Date(s.endTime).getTime() : new Date().getTime()) - new Date(s.startTime).getTime();
      const seconds = Math.floor(duration / 1000);

      if (!userMap.has(s.userId)) {
        userMap.set(s.userId, {
          user: { id: s.userId, name: s.user.name, email: s.user.email },
          totalSeconds: 0,
          manualSeconds: 0,
          lastTaskName: '',
          sessions: []
        });
      }
      const uData = userMap.get(s.userId);
      uData.totalSeconds += seconds;
      if (s.isManual) uData.manualSeconds += seconds;
      uData.sessions.push(s);
      uData.lastTaskName = s.task.name; // Since ordered asc, last one is correct
    });

    return Array.from(userMap.values());
  }

  async getEmployeeHistory(userId: number, start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.timeSession.findMany({
      where: { userId, startTime: { gte: startDate, lte: endDate } },
      orderBy: { startTime: 'asc' }
    });

    // Group by Date
    const dateMap = new Map<string, { date: string, totalSeconds: number, sessions: any[] }>();

    // Initialize buckets for range? Optional, but let's just show active days
    sessions.forEach(s => {
      const dKey = format(new Date(s.startTime), 'yyyy-MM-dd');
      const duration = (s.endTime ? new Date(s.endTime).getTime() : new Date().getTime()) - new Date(s.startTime).getTime();
      const seconds = Math.floor(duration / 1000);

      if (!dateMap.has(dKey)) {
        dateMap.set(dKey, { date: dKey, totalSeconds: 0, sessions: [] });
      }
      const dData = dateMap.get(dKey)!;
      dData.totalSeconds += seconds;
      dData.sessions.push(s);
    });

    return Array.from(dateMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getUserStats(userId: number) {
    const today = new Date();
    const startDay = startOfDay(today);
    const startWeek = subDays(today, 7);

    const daySessions = await this.prisma.timeSession.findMany({
      where: { userId, startTime: { gte: startDay } }
    });
    const weekSessions = await this.prisma.timeSession.findMany({
      where: { userId, startTime: { gte: startWeek } }
    });

    const calc = (sessions: any[]) => sessions.reduce((acc, s) => {
      const end = s.endTime ? new Date(s.endTime).getTime() : new Date().getTime();
      return acc + Math.floor((end - new Date(s.startTime).getTime()) / 1000);
    }, 0);

    return {
      day: calc(daySessions),
      week: calc(weekSessions)
    };
  }

  async saveScreenshot(data: { timeSessionId: number, imageUrl: string, capturedAt: string }) {
    return this.prisma.screenshot.create({
      data: {
        timeSessionId: data.timeSessionId,
        imageUrl: data.imageUrl,
        capturedAt: new Date(data.capturedAt)
      }
    });
  }

  async getSummary(start: string, end: string, userId?: number) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const where: any = { startTime: { gte: startDate, lte: endDate } };
    if (userId) where.userId = userId;

    const sessions = await this.prisma.timeSession.findMany({
      where,
      include: { user: true, task: { include: { project: true } } }
    });

    // Maps to store aggregated data
    const empMap = new Map<number, { id: number, name: string, email: string, manual: number, tracked: number }>();
    const projMap = new Map<number, { id: number, name: string, manual: number, tracked: number }>();
    const taskMap = new Map<number, { id: number, name: string, projectName: string, manual: number, tracked: number }>();

    sessions.forEach(s => {
      const duration = (s.endTime ? new Date(s.endTime).getTime() : new Date().getTime()) - new Date(s.startTime).getTime();
      const seconds = Math.floor(duration / 1000);
      const isManual = s.isManual;

      // Employee Stats
      if (!empMap.has(s.userId)) {
        empMap.set(s.userId, {
          id: s.userId, name: s.user.name || 'Unknown', email: s.user.email, manual: 0, tracked: 0
        });
      }
      const eStat = empMap.get(s.userId)!;
      if (isManual) eStat.manual += seconds; else eStat.tracked += seconds;

      // Project Stats
      const pid = s.task.projectId;
      const pName = s.task.project?.name || 'Unassigned';
      if (!projMap.has(pid)) {
        projMap.set(pid, { id: pid, name: pName, manual: 0, tracked: 0 });
      }
      const pStat = projMap.get(pid)!;
      if (isManual) pStat.manual += seconds; else pStat.tracked += seconds;

      // Task Stats
      const tid = s.taskId;
      if (!taskMap.has(tid)) {
        taskMap.set(tid, {
          id: tid, name: s.task.name, projectName: pName, manual: 0, tracked: 0
        });
      }
      const tStat = taskMap.get(tid)!;
      if (isManual) tStat.manual += seconds; else tStat.tracked += seconds;
    });

    const employees = Array.from(empMap.values()).map(e => ({
      ...e, totalSeconds: e.tracked + e.manual, manualSeconds: e.manual
    })).sort((a, b) => b.totalSeconds - a.totalSeconds);

    const projects = Array.from(projMap.values()).map(p => ({
      ...p, totalSeconds: p.tracked + p.manual, manualSeconds: p.manual
    })).sort((a, b) => b.totalSeconds - a.totalSeconds);

    const tasks = Array.from(taskMap.values()).map(t => ({
      ...t, totalSeconds: t.tracked + t.manual, manualSeconds: t.manual
    })).sort((a, b) => b.totalSeconds - a.totalSeconds);

    return { employees, projects, tasks };
  }
}