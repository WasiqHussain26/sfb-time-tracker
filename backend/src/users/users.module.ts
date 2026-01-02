import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module'; // <--- Import this

@Module({
  imports: [MailModule], // <--- Add MailModule to imports
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
})
export class UsersModule {}