import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // <--- CRITICAL: Allows other modules to use MailService
})
export class MailModule {}