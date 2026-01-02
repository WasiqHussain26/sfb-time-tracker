import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // 1. CREATE TASK
  async create(createTaskDto: CreateTaskDto) {
    const { assigneeIds, projectId, ...rest } = createTaskDto;
    
    return this.prisma.task.create({
      data: {
        ...rest,
        // FORCE CONVERSION TO NUMBER (Fixes the 500 Error)
        projectId: Number(projectId), 
        
        // Connect Assignees if provided
        assignees: assigneeIds && assigneeIds.length > 0 ? {
          connect: assigneeIds.map((id) => ({ id: Number(id) }))
        } : undefined,
      },
      include: { assignees: true }
    });
  }

  // 2. GET ALL (Optional helper)
  findAll() {
    return this.prisma.task.findMany();
  }

  // 3. GET ONE
  findOne(id: number) {
    return this.prisma.task.findUnique({
      where: { id },
      include: { assignees: true, subtasks: true }
    });
  }

  // 4. UPDATE TASK
  async update(id: number, updateTaskDto: UpdateTaskDto) {
    const { assigneeIds, projectId, ...rest } = updateTaskDto;

    return this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        // Update Status/Name directly via ...rest
        
        // Update Assignees (Replace old list with new list)
        assignees: assigneeIds ? {
          set: assigneeIds.map((uid) => ({ id: Number(uid) }))
        } : undefined,
      },
      include: { assignees: true }
    });
  }

  // 5. DELETE
  remove(id: number) {
    return this.prisma.task.delete({ where: { id } });
  }
}