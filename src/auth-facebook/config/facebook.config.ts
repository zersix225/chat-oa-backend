import { registerAs } from '@nestjs/config';

import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { FacebookConfig } from './facebook-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  FACEBOOK_APP_ID: string;

  @IsString()
  @IsOptional()
  FACEBOOK_APP_SECRET: string;

  @IsString()
  @IsOptional()
  FACEBOOK_ACCESS_TOKEN: string;

  @IsString()
  @IsOptional()
  FACEBOOK_PAGE_ID: string;
}

export default registerAs<FacebookConfig>('facebook', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
    pageId: process.env.FACEBOOK_PAGE_ID,
  };
});
