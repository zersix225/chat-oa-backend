import {
  // common
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateConversationsDto } from './dto/create-conversations.dto';
import { UpdateConversationsDto } from './dto/update-conversations.dto';
import { ConversationsRepository } from './infrastructure/persistence/conversations.repository';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { Conversations } from './domain/conversations';
import { DataSource } from 'typeorm';
import { ConversationsEntity } from '@/conversations/infrastructure/persistence/relational/entities/conversations.entity';
import { ContactEntity } from '@/contacts/infrastructure/persistence/relational/entities/contact.entity';
import { MessageEntity } from '@/messages/infrastructure/persistence/relational/entities/message.entity';
import { UsersService } from '@/users/users.service';
import { WebsocketGateway } from '@/websocket/websocket.gateway';
import { User } from '@/users/domain/user';
import { RoleEnum } from '@/roles/roles.enum';

@Injectable()
export class ConversationsService {
  constructor(
    // Dependencies here
    private readonly conversationsRepository: ConversationsRepository,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async create(payload: CreateConversationsDto) {
    return this.conversationsRepository.create(payload);
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.conversationsRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Conversations['id']) {
    return this.conversationsRepository.findById(id);
  }

  async findByContactId(contactId: Conversations['contactId']) {
    const existConversation =
      await this.conversationsRepository.findByIdWithDelete(contactId);

    if (existConversation) {
      await this.dataSource.manager.transaction(
        async (transactionalRestore) => {
          await transactionalRestore
            .getRepository(ConversationsEntity)
            .restore(existConversation.id);
          await transactionalRestore
            .getRepository(ContactEntity)
            .restore(contactId);
          await transactionalRestore
            .getRepository(MessageEntity)
            .restore({ conversationId: existConversation.id });
        },
      );
      return existConversation;
    }
    return this.conversationsRepository.findByContactId(contactId);
  }

  findByIds(ids: Conversations['id'][]) {
    return this.conversationsRepository.findByIds(ids);
  }

  async update(
    id: Conversations['id'],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateConversationsDto: UpdateConversationsDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.conversationsRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
    });
  }

  private isAdmin(user: User | null) {
    return Number(user?.role?.id) === RoleEnum.admin;
  }

  async findAssignees(requesterId: number) {
    const requester = await this.usersService.findById(requesterId);
    const users = await this.usersService.findManyWithPagination({
      paginationOptions: { page: 1, limit: 200 },
    });
    return users
      .filter((user) => this.isAdmin(requester) || !this.isAdmin(user))
      .map((user) => ({
        id: Number(user.id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        photo: user.photo ?? null,
        role: user.role ?? null,
      }));
  }

  async assign(
    id: Conversations['id'],
    assigneeId: number | null,
    assignedById: number,
  ): Promise<Conversations> {
    const conversation = await this.conversationsRepository.findById(id);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    const assignee = assigneeId
      ? await this.usersService.findById(assigneeId)
      : null;
    if (assigneeId && !assignee) {
      throw new NotFoundException(`User ${assigneeId} not found`);
    }

    const assignedBy = await this.usersService.findById(assignedById);

    if (!this.isAdmin(assignedBy) && this.isAdmin(assignee)) {
      throw new ForbiddenException('Members cannot assign chats to an admin');
    }

    const newAssigneeId = assignee ? Number(assignee.id) : null;

    await this.conversationsRepository.update(id, {
      assigneeId: newAssigneeId,
    });

    const toAssignUser = (user: User | null) =>
      user
        ? {
            id: Number(user.id),
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : null;

    this.websocketGateway.emitConversationAssigned({
      conversationId: id,
      contactName: conversation.contact?.displayName ?? null,
      assigneeId: newAssigneeId,
      assignee: toAssignUser(assignee),
      assignedBy: toAssignUser(assignedBy),
      assignedAt: new Date(),
    });

    return {
      ...conversation,
      assigneeId: newAssigneeId,
      assignee,
    };
  }

  remove(id: Conversations['id']) {
    return this.conversationsRepository.remove(id);
  }
}
