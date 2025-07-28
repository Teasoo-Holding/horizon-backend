import { OmitType } from "@nestjs/swagger";
import { RegisterDto } from "src/auth/dto";

export class CreateUserDto extends OmitType(RegisterDto, ['password'] as const) {}
