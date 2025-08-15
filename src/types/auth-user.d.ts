import { Request } from 'express';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  companyId: number;
  departmentId?: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
