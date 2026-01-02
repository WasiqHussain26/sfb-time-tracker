import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ensure you have this guard
import { ReportSchedulerService } from './report-scheduler.service'; // <--- 1. Import This

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportSchedulerService: ReportSchedulerService
  ) {}

  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('user')
  getUserReport(
    @Query('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getUserReport(+userId, start, end);
  }
  
  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('project')
  getProjectReport(
    @Query('projectId') projectId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getProjectReport(+projectId, start, end);
  }

  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('timesheet')
  getTimesheet(
    @Query('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getTimesheet(+userId, start, end);
  }

  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('timeline')
  getUserTimeline(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    return this.reportsService.getUserTimeline(+userId, date);
  }

  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('payroll')
  getPayroll(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getPayrollReport(start, end);
  }
  
  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('daily-timeline')
  getDailyTimeline(@Query('date') date: string) {
    return this.reportsService.getDailyTimeline(date);
  }

  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('employee-history')
  getEmployeeHistory(
    @Query('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getEmployeeHistory(+userId, start, end);
  }

  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('stats')
  getUserStats(@Query('userId') userId: string) {
    return this.reportsService.getUserStats(+userId);
  }

  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Post('screenshot')
  saveScreenshot(@Body() body: { timeSessionId: number, imageUrl: string, capturedAt: string }) {
    return this.reportsService.saveScreenshot(body);
  }

  @UseGuards(JwtAuthGuard) // Protects all report routes
  @Get('summary')
  getSummary(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('userId') userId?: string,
  ) {
    return this.reportsService.getSummary(start, end, userId ? +userId : undefined);
  }

  @Get('test-email')
  async triggerDailyReport() {
    console.log("👆 Manual trigger received. Sending emails...");
    
    // This calls the exact same logic your Cron Job uses
    await this.reportSchedulerService.handleDailyReports();
    
    return { message: 'Daily Report Emails have been fired! Check your inbox.' };
  }
}