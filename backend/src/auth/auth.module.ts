import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy'; // <--- Import Strategy
import { UsersModule } from '../users/users.module'; // <--- Import UsersModule
import { MailModule } from '../mail/mail.module';   // <--- Import MailModule
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SECRET_KEY',
      signOptions: { expiresIn: '7d' }, // Token expires in 7 days
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy], // <--- Add Strategy to Providers
  exports: [AuthService],
})
export class AuthModule {}