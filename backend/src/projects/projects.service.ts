import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  // 1. CREATE Project
  async create(createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        managers: {
          connect: createProjectDto.managerIds?.map((id) => ({ id })) || [],
        },
      },
      include: { managers: true },
    });
  }

  // 2. GET ALL (With Search)
  async findAll(search?: string) {
    return this.prisma.project.findMany({
      where: search ? {
        name: { contains: search, mode: 'insensitive' },
      } : {},
      include: {
        managers: true,
        _count: { select: { tasks: true } } // Count how many tasks it has
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. GET ONE PROJECT (With deep details)
  async findOne(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { 
        managers: true, 
        tasks: {
          include: { 
            assignees: true // <--- THIS WAS MISSING!
          },
          orderBy: { id: 'desc' } // Optional: Newest tasks first
        } 
      },
    });
  }

  // 4. UPDATE (Edit Name, Managers, Status)
  async update(id: number, updateProjectDto: any) {
    const { managerIds, ...rest } = updateProjectDto;

    return this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        // This magic line replaces the old managers with the new list
        managers: managerIds ? { 
          set: managerIds.map((uid: number) => ({ id: +uid })) 
        } : undefined,
      },
      include: { managers: true },
    });
  }

  // 5. MARK COMPLETED
  async markCompleted(id: number) {
    return this.prisma.project.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  // 6. CANCEL (Instead of Delete)
  async cancel(id: number) {
    return this.prisma.project.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}