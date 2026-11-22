import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../../utils/validate-config';
import { TiktokConfig } from './tiktok-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  TIKTOK_CLIENT_KEY: string;

  @IsString()
  @IsOptional()
  TIKTOK_CLIENT_SECRET: string;
}

export default registerAs<TiktokConfig>('tiktok', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  };
});
