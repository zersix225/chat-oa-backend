import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebSocketModule {}
