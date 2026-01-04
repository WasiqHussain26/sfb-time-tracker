import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  getUserReport(
    @Query('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getUserReport(+userId, start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Get('project')
  getProjectReport(
    @Query('projectId') projectId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getProjectReport(+projectId, start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Get('timesheet')
  getTimesheet(
    @Query('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getTimesheet(+userId, start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Get('timeline')
  getUserTimeline(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    return this.reportsService.getUserTimeline(+userId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('payroll')
  getPayroll(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getPayrollReport(start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Get('daily-timeline')
  getDailyTimeline(@Query('date') date: string) {
    return this.reportsService.getDailyTimeline(date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('employee-history')
  getEmployeeHistory(
    @Query('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportsService.getEmployeeHistory(+userId, start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getUserStats(@Query('userId') userId: string) {
    return this.reportsService.getUserStats(+userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('screenshot')
  saveScreenshot(@Body() body: { timeSessionId: number, imageUrl: string, capturedAt: string }) {
    return this.reportsService.saveScreenshot(body);
  }

  @UseGuards(JwtAuthGuard)
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

    // Call the method from ReportsService
    await this.reportsService.handleDailyReports();

    return { message: 'Daily Report Emails have been fired! Check your inbox.' };
  }
}