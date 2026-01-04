import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // <--- IMPORT
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service'; // <--- IMPORT
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // <--- INIT SCHEDULER
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    TimeTrackingModule,
    MailModule
  ],
  controllers: [AppController, ReportsController],
  providers: [AppService, ReportsService], // <--- REGISTER SERVICE
})
export class AppModule { }
