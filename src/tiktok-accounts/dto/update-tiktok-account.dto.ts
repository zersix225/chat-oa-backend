// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateTiktokAccountDto } from './create-tiktok-account.dto';

export class UpdateTiktokAccountDto extends PartialType(
  CreateTiktokAccountDto,
) {}
