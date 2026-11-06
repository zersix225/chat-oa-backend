import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SenderDto {
  @ApiProperty()
  @IsString()
  id: string;
}

export class RecipientDto {
  @ApiProperty()
  @IsString()
  id: string;
}

export class AttachmentPayloadDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;
}

export class AttachmentDto {
  @ApiProperty({
    description: 'image | video | audio | file | fallback | template ...',
  })
  @IsString()
  type: string;

  @ApiProperty({ type: AttachmentPayloadDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AttachmentPayloadDto)
  payload?: AttachmentPayloadDto;
}

class WebhookDto {
  @ApiProperty()
  @IsString()
  mid: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ type: AttachmentDto, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class MessagingEventDto {
  @ApiProperty({ type: SenderDto })
  @ValidateNested()
  @Type(() => SenderDto)
  sender: SenderDto;

  @ApiProperty({ type: RecipientDto })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient: RecipientDto;

  @ApiProperty()
  @IsNumber()
  timestamp: number;

  @ApiProperty({ type: WebhookDto })
  @ValidateNested()
  @Type(() => WebhookDto)
  message: WebhookDto;
}

export class EntryDto {
  @ApiProperty()
  @IsNumber()
  time: number;

  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ type: MessagingEventDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessagingEventDto)
  messaging: MessagingEventDto[];
}

export class FacebookWebhookDto {
  @ApiProperty()
  @IsString()
  object: string;

  @ApiProperty({ type: EntryDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntryDto)
  entry: EntryDto[];
}
