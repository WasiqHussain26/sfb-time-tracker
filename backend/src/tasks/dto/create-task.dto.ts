export class CreateTaskDto {
  name: string;
  projectId: number;
  assigneeIds?: number[];
  isOpenToAll?: boolean;
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'; // <--- Added this
}