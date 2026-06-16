// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateLineContactDto } from './create-line-contact.dto';

export class UpdateLineContactDto extends PartialType(CreateLineContactDto) {}
