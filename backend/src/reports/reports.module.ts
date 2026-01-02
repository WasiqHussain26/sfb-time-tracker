import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportSchedulerService } from './report-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module'; // <--- Import this

@Module({
  imports: [MailModule], // <--- Add MailModule to imports
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, ReportSchedulerService],
})
export class ReportsModule {}