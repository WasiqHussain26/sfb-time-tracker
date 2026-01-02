import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { ReportsModule } from './reports/reports.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { ScheduleModule } from '@nestjs/schedule'; // <--- Import Schedule
import { MailService } from './mail/mail.service'; // <--- Import MailService
import { MailModule } from './mail/mail.module'; // <--- Import MailModule

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, ProjectsModule, TasksModule, ReportsModule, TimeTrackingModule, ScheduleModule.forRoot(), MailModule],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}
