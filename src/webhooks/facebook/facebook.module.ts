import { FacebookController } from '@/webhooks/facebook/facebook.controller';
import { Module } from '@nestjs/common';
import { FacebookService } from '@/webhooks/facebook/facebook.servive';
import { MessagesModule } from '@/messages/messages.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import FacebookConfig from '@/auth-facebook/config/facebook.config';
import { ContactsModule } from '@/contacts/contacts.module';
import { ConversationsModule } from '@/conversations/conversations.module';
import { FilesModule } from '@/files/files.module';

@Module({
  imports: [
    MessagesModule,
    ContactsModule,
    ConversationsModule,
    HttpModule,
    FilesModule,
    ConfigModule.forFeature(FacebookConfig),
  ],
  controllers: [FacebookController],
  providers: [FacebookService],
})
export class FacebookModule {}
