import { PartialType } from '@nestjs/swagger';
import { CreateScope2Dto } from './create-scope-2.market_baseddto';

export class UpdateScope2Dto extends PartialType(CreateScope2Dto) {}
