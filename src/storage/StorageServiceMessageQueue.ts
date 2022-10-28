import type { EncryptedMessage, Logger } from "@aries-framework/core";
import type { MessageRepository as MessageQueue } from "@aries-framework/core/build/storage/MessageRepository";

import { injectable, AgentConfig } from "@aries-framework/core";

import { MessageRecord } from "./MessageRecord";
import { MessageRepository } from "./MessageRepository";

@injectable()
export class StorageServiceMessageQueue implements MessageQueue {
  private logger: Logger;
  private messageRepository: MessageRepository;

  public constructor(
    agentConfig: AgentConfig,
    messageRepository: MessageRepository
  ) {
    this.logger = agentConfig.logger;
    this.messageRepository = messageRepository;
  }

  public async takeFromQueue(
    connectionId: string,
    limit?: number,
    keepMessages = false
  ) {
    const messageRecords = await this.messageRepository.findByConnectionId(
      connectionId
    );

    const messagesToTake = limit ?? messageRecords.length;
    this.logger.debug(
      `Taking ${messagesToTake} messages from queue for connection ${connectionId} (of total ${
        messageRecords.length
      }) with keepMessages=${String(keepMessages)}`
    );

    const messageRecordsToReturn = messageRecords.splice(0, messagesToTake);

    if (!keepMessages) {
      const deletePromises = messageRecordsToReturn.map((message) =>
        this.messageRepository.deleteById(message.id)
      );
      await Promise.all(deletePromises);
    }

    return messageRecordsToReturn.map((messageRecord) => messageRecord.message);
  }

  public async add(connectionId: string, payload: EncryptedMessage) {
    await this.messageRepository.save(
      new MessageRecord({
        connectionId,
        message: payload,
      })
    );
  }

  public async getAvailableMessageCount(connectionId: string): Promise<number> {
    const messageRecords = await this.messageRepository.findByConnectionId(
      connectionId
    );

    return messageRecords.length;
  }
}
