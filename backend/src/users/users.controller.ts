import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =========================================================
  // ⚠️ IMPORTANT: STATIC ROUTES MUST BE DEFINED FIRST
  // =========================================================

  // 1. GLOBAL SETTINGS (Must be before :id routes)
  @UseGuards(JwtAuthGuard)
  @Patch('global-settings')
  updateGlobalSettings(@Body() body: { autoStopLimit: number }) {
    return this.usersService.updateGlobalSettings(body.autoStopLimit);
  }

  // 2. INVITE
  @UseGuards(JwtAuthGuard)
  @Post('invite')
  invite(@Body() createUserDto: CreateUserDto) {
    return this.usersService.invite(createUserDto);
  }

  // 3. ACCEPT INVITE
  @Post('accept-invite')
  acceptInvite(@Body() body: { token: string, password: string }) {
    return this.usersService.acceptInvite(body.token, body.password);
  }

  // 4. GET ALL
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // =========================================================
  // DYNAMIC ROUTES (:id) COME AFTER
  // =========================================================

  // 5. UPDATE STATUS
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'DISABLED' }) {
    return this.usersService.updateStatus(+id, body.status);
  }

  // 6. UPDATE INDIVIDUAL SETTINGS
  @UseGuards(JwtAuthGuard)
  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() body: { autoStopLimit: number }) {
    return this.usersService.updateSettings(+id, body.autoStopLimit);
  }

  // 7. GET ONE
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  // 8. UPDATE INFO (This was catching 'global-settings' before!)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  // 9. DELETE USER
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}