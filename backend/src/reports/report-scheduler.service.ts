import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ReportSchedulerService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  // Run at 11:55 PM every day
  // To test immediately, change to: @Cron(CronExpression.EVERY_30_SECONDS)
  @Cron('55 23 * * *') 
  async handleDailyReports() {
    console.log('⏰ Starting Daily Report Generation...');

    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' } 
    });

    // --- 1. NATIVE DATE CALCULATIONS (No date-fns) ---
    const now = new Date();
    
    // Start of Today (00:00:00)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // End of Today (23:59:59)
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // 7 Days Ago (Start of day)
    const last7DaysStart = new Date(todayStart);
    last7DaysStart.setDate(last7DaysStart.getDate() - 6); 

    let adminReportHtml = '';

    // 2. GENERATE REPORT FOR EACH USER
    for (const user of users) {
      // A. Today's Sessions
      const todaySessions = await this.prisma.timeSession.findMany({
        where: { userId: user.id, startTime: { gte: todayStart, lte: todayEnd } },
        include: { task: { include: { project: true } } }
      });

      // B. Last 7 Days Sessions
      const weekSessions = await this.prisma.timeSession.findMany({
        where: { userId: user.id, startTime: { gte: last7DaysStart, lte: todayEnd } },
        orderBy: { startTime: 'desc' },
        include: { task: { include: { project: true } } }
      });

      // C. Format HTML
      const todayHtml = this.generateTableHtml(todaySessions, 'Today');
      const weekHtml = this.generateTableHtml(weekSessions, 'Last 7 Days');

      // D. Send Email (Fixed 'null' name error)
      const userName = user.name || 'Valued Employee';
      await this.mailService.sendEmployeeReport(user.email, userName, todayHtml, weekHtml);

      // E. Append to Admin Report
      adminReportHtml += `
        <div style="margin-bottom: 30px; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #444;">👤 ${userName} (${user.role})</h3>
          ${todayHtml}
          <div style="margin-top:10px; font-size: 11px; color: #666;">
             <strong>7-Day Total:</strong> ${this.formatDuration(this.calculateTotal(weekSessions))}
          </div>
        </div>
      `;
    }

    // 3. SEND ADMIN REPORT
    const admins = users.filter(u => u.role === 'ADMIN' || u.role === 'EMPLOYER');
    
    for (const admin of admins) {
      const adminName = admin.name || 'Admin';
      await this.mailService.sendAdminReport(admin.email, adminName, adminReportHtml);
    }

    console.log('✅ Daily Reporting Complete.');
  }

  // --- HELPERS ---

  private calculateTotal(sessions: any[]) {
    return sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  }

  private formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  private generateTableHtml(sessions: any[], title: string) {
    if (sessions.length === 0) return `<p><em>No activity recorded for ${title}.</em></p>`;

    let rows = sessions.map(s => `
      <tr>
        <td style="padding: 5px; border-bottom: 1px solid #eee;">${s.task?.project?.name || '-'}</td>
        <td style="padding: 5px; border-bottom: 1px solid #eee;">${s.task?.name || 'Unknown'}</td>
        <td style="padding: 5px; border-bottom: 1px solid #eee; font-family: monospace;">${this.formatDuration(s.duration)}</td>
        <td style="padding: 5px; border-bottom: 1px solid #eee; font-size: 11px; color: #666;">${s.notes || ''}</td>
      </tr>
    `).join('');

    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 5px;">Project</th>
            <th style="padding: 5px;">Task</th>
            <th style="padding: 5px;">Time</th>
            <th style="padding: 5px;">Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
           <tr>
             <td colspan="4" style="padding-top: 5px; font-weight: bold; text-align: right;">
               Total: ${this.formatDuration(this.calculateTotal(sessions))}
             </td>
           </tr>
        </tfoot>
      </table>
    `;
  }
}