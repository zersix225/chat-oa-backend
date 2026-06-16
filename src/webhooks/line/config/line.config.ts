import { registerAs } from '@nestjs/config';
import { LineConfig } from './line-config.type';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  LINE_CHANNEL_ACCESS_TOKEN: string;

  @IsString()
  @IsOptional()
  LINE_CHANNEL_SECRET: string;

  @IsString()
  @IsOptional()
  LINE_CHANNEL_NAME: string;
}

export default registerAs<LineConfig>('line', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelName: process.env.LINE_CHANNEL_NAME,
  };
});
