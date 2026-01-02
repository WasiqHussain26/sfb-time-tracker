import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ⚠️ IMPORTANT: This must match the secret used in AuthModule
      secretOrKey: 'SECRET_KEY', 
    });
  }

  async validate(payload: any) {
    // This function runs after the token is verified signature-wise.
    // We check if the user is still active in the DB.
    
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
        throw new UnauthorizedException();
    }
    
    // Double check status here for extra security on every request
    if (user.status === 'DISABLED') {
        throw new UnauthorizedException('User is deactivated');
    }

    return user; // This attaches the user object to Request
  }
}