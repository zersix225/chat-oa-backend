import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import tiktokConfig from '@/webhooks/tiktok/config/tiktok.config';
import { TiktokController } from '@/webhooks/tiktok/tiktok.controller';
import { TiktokService } from '@/webhooks/tiktok/tiktok.service';
import { MessagesModule } from '@/messages/messages.module';
import { ContactsModule } from '@/contacts/contacts.module';
import { ConversationsModule } from '@/conversations/conversations.module';
import { TiktokAccountsModule } from '@/tiktok-accounts/tiktok-accounts.module';
import { TiktokOauthController } from '@/webhooks/tiktok/tiktok-oauth.controller';
import { TiktokOauthService } from '@/webhooks/tiktok/tiktok-oauth.service';
import { TiktokApiClient } from '@/webhooks/tiktok/tiktok-api.client';
import { FilesModule } from '@/files/files.module';

@Module({
  imports: [
    ConfigModule.forFeature(tiktokConfig),
    HttpModule,
    MessagesModule,
    ContactsModule,
    ConversationsModule,
    TiktokAccountsModule,
    FilesModule,
  ],
  controllers: [TiktokController, TiktokOauthController],
  providers: [TiktokService, TiktokOauthService, TiktokApiClient],
  exports: [TiktokService, TiktokOauthService],
})
export class TiktokModule {}
