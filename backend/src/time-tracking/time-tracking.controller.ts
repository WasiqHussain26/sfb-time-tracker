import { Controller, Post, Body, Get, Query, BadRequestException, Delete, Param, UseGuards } from '@nestjs/common'; // <--- Added UseGuards
import { TimeTrackingService } from './time-tracking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 

@Controller('time-tracking')
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('start')
  start(@Body() body: { userId: number, taskId: number }) {
    if (!body.userId || !body.taskId) {
      throw new BadRequestException('UserId and TaskId are required');
    }
    return this.timeTrackingService.startSession(+body.userId, +body.taskId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stop')
  stop(@Body() body: { userId: number; idleTime: number; notes?: string }) { 
    return this.timeTrackingService.stopSession(body.userId, body.idleTime, body.notes);
  }

  @Get('active')
  getActive(@Query('userId') userId: string) {
    return this.timeTrackingService.getActiveSession(+userId);
  }

  @Post('manual')
  async addManualEntry(@Body() body: { userId: number, taskId: number, startTime: string, endTime: string }) {
    return this.timeTrackingService.addManualSession(body);
  }

  // DELETE ENDPOINT
  @Delete(':id')
  deleteSession(
    @Param('id') id: string,
    @Query('userId') userId: string 
  ) {
    return this.timeTrackingService.deleteSession(+id, +userId);
  }
}