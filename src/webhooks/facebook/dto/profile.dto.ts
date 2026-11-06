import { IsString, IsUrl } from 'class-validator';

export class ProfileDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsUrl()
  profile_pic: string;

  @IsString()
  id: string;
}
