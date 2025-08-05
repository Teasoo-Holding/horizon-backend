export class JWTUserDto extends Request {
  
    userId: number;
    email: string;
    role: string;
    companyId: number


}


export class TeasoAdminSendRequest {
    email: string;
    role: string;
    
}