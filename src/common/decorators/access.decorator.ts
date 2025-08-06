import { SetMetadata } from '@nestjs/common';

export const ACCESS_KEY = 'access';
export const Access = (...accessLevels: string[]) =>
  SetMetadata(ACCESS_KEY, accessLevels);
