import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { instanceToPlain } from 'class-transformer';
import deepResolvePromises from '@/utils/deep-resolver';
import { AllConfigType } from '@/config/config.type';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';

/** Room every authenticated admin joins; inbox-wide events go here. */
export const ADMINS_ROOM = 'admins';
const conversationRoom = (conversationId: string) =>
  `conversation:${conversationId}`;
const CONVERSATION_ROOM_PREFIX = 'conversation:';

/** Server → client event names (kept identical to the previous ones). */
export const WsEvent = {
  NEW_MESSAGE: 'new-message',
  CONVERSATION_READ: 'conversation-read',
  CONVERSATION_VIEWERS: 'conversation-viewers',
  CONVERSATION_ASSIGNED: 'conversation-assigned',
} as const;

type AuthedSocket = Socket & { data: { user?: JwtPayloadType } };

type AssignUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
};

export type ConversationAssignedEvent = {
  conversationId: string;
  contactName: string | null;
  assigneeId: number | null;
  assignee: AssignUser | null;
  assignedBy: AssignUser | null;
  assignedAt: Date;
};

export type ConversationReadEvent = {
  conversationId: string;
  userId: number;
  lastReadMessageId: string | null | undefined;
  lastReadAt: Date;
};

@WebSocketGateway({
  // Same policy as the HTTP API (main.ts uses `cors: true`). Access is
  // enforced by the JWT check below, not by origin.
  cors: { origin: true, credentials: true },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  /**
   * Authenticate during the handshake, before the connection is accepted.
   * Client: io(url, { auth: { token: '<access token>' } })
   * (an `Authorization: Bearer <token>` header also works).
   */
  afterInit(server: Server): void {
    server.use((socket: AuthedSocket, next) => {
      const token = this.extractToken(socket);
      if (!token) return next(new Error('Unauthorized'));

      this.jwtService
        .verifyAsync<JwtPayloadType>(token, {
          secret: this.configService.getOrThrow('auth.secret', {
            infer: true,
          }),
        })
        .then((payload) => {
          if (!payload?.id) return next(new Error('Unauthorized'));
          socket.data.user = payload;
          next();
        })
        .catch(() => next(new Error('Unauthorized')));
    });
  }

  async handleConnection(client: AuthedSocket): Promise<void> {
    const userId = client.data.user?.id;
    await client.join([ADMINS_ROOM, `user:${userId}`]);
    this.logger.log(`Client connected: ${client.id} (user ${userId})`);

    // Rooms are already empty in handleDisconnect, so capture them here.
    client.on('disconnecting', () => {
      const rooms = [...client.rooms].filter((r) =>
        r.startsWith(CONVERSATION_ROOM_PREFIX),
      );
      // Run after the socket has actually left.
      setImmediate(() => {
        for (const room of rooms) {
          void this.broadcastViewers(
            room.slice(CONVERSATION_ROOM_PREFIX.length),
          );
        }
      });
    });
  }

  handleDisconnect(client: AuthedSocket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ---------- client → server ----------

  /** Admin opened a chat: join its room so others can see who is viewing. */
  @SubscribeMessage('join-conversation')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean }> {
    if (!body?.conversationId) return { ok: false };
    await client.join(conversationRoom(body.conversationId));
    await this.broadcastViewers(body.conversationId);
    return { ok: true };
  }

  @SubscribeMessage('leave-conversation')
  async leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean }> {
    if (!body?.conversationId) return { ok: false };
    await client.leave(conversationRoom(body.conversationId));
    await this.broadcastViewers(body.conversationId);
    return { ok: true };
  }

  // ---------- server → client (called from services) ----------

  /** Emit a message that has already been saved (has an id). */
  emitNewMessage(message: { id: string; conversationId: string }): void {
    // Serialize like the HTTP API does, so `file.path` becomes a full URL
    // (and S3 signed URLs are resolved).
    this.toPlain(message)
      .then((payload) =>
        this.server?.to(ADMINS_ROOM).emit(WsEvent.NEW_MESSAGE, payload),
      )
      .catch((error: unknown) =>
        this.logger.error(`Failed to emit ${WsEvent.NEW_MESSAGE}`, error),
      );
  }

  emitConversationRead(event: ConversationReadEvent): void {
    this.server?.to(ADMINS_ROOM).emit(WsEvent.CONVERSATION_READ, event);
  }

  emitConversationAssigned(event: ConversationAssignedEvent): void {
    this.server?.to(ADMINS_ROOM).emit(WsEvent.CONVERSATION_ASSIGNED, event);
  }

  // ---------- helpers ----------

  private toPlain(value: object): Promise<unknown> {
    return deepResolvePromises(instanceToPlain(value));
  }

  private async broadcastViewers(conversationId: string): Promise<void> {
    const room = conversationRoom(conversationId);
    const sockets = await this.server.in(room).fetchSockets();
    const userIds = [
      ...new Set(
        sockets
          .map((s) => (s.data as AuthedSocket['data']).user?.id)
          .filter((id) => id !== undefined),
      ),
    ];
    this.server
      .to(room)
      .emit(WsEvent.CONVERSATION_VIEWERS, { conversationId, userIds });
  }

  private extractToken(socket: Socket): string | undefined {
    const fromAuth = (socket.handshake.auth as { token?: unknown })?.token;
    if (typeof fromAuth === 'string' && fromAuth) {
      return fromAuth.replace(/^Bearer\s+/i, '');
    }
    const header = socket.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return undefined;
  }
}
