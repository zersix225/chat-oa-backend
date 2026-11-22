import { registerAs } from '@nestjs/config';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import validateConfig from '../../../utils/validate-config';
import { TiktokConfig } from './tiktok-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  TIKTOK_CLIENT_KEY: string;

  @IsString()
  @IsOptional()
  TIKTOK_CLIENT_SECRET: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  TIKTOK_REDIRECT_URI: string;

  @IsString()
  @IsOptional()
  TIKTOK_SCOPES: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  TIKTOK_BUSINESS_API_BASE_URL: string;
}

export default registerAs<TiktokConfig>('tiktok', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    redirectUri: process.env.TIKTOK_REDIRECT_URI,
    scopes: process.env.TIKTOK_SCOPES || 'user.info.basic',
    businessApiBaseUrl:
      process.env.TIKTOK_BUSINESS_API_BASE_URL ||
      'https://business-api.tiktok.com/open_api/v1.3',
  };
});
