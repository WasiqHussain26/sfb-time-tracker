import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // <--- Add this line to make it available everywhere
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // <--- Add this line
})
export class PrismaModule {}