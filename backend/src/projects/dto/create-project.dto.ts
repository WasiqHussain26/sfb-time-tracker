export class CreateProjectDto {
  name: string;
  managerIds?: number[]; // List of User IDs who manage this
}