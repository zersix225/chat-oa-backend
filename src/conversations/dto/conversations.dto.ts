import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ContactEntity } from '@/contacts/infrastructure/persistence/relational/entities/contact.entity';

export class ConversationsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  contact: ContactEntity;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contactId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastMessageId: string;
}
