export class CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'EMPLOYER' | 'EMPLOYEE';
  hourlyRate?: number;
  autoStopLimit?: number;
}