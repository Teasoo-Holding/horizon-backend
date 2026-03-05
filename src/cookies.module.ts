import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookiesConfig from './cookies.config';

// Cookie parsing is handled globally in main.ts via app.use(cookieParser()).
// This module only exports the cookies config for injection elsewhere.
@Module({
  imports: [ConfigModule.forFeature(cookiesConfig)],
})
export class CookiesModule {}
