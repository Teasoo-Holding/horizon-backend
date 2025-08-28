import { PartialType } from '@nestjs/swagger';
import { MarketBasedS2Dto } from './create-scope-2.market_baseddto';

export class UpdateScope2Dto extends PartialType(MarketBasedS2Dto) {}
