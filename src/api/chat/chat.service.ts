import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { StreamChat } from 'stream-chat';

@Injectable()
export class ChatService {
  private client: StreamChat;

  constructor() {
    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error(
        'STREAM_API_KEY and STREAM_API_SECRET environment variables are required',
      );
    }
    this.client = StreamChat.getInstance(apiKey, apiSecret);
  }

  createToken(userId: Types.ObjectId): string {
    return this.client.createToken(userId.toString());
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    return this.client.verifyWebhook(rawBody, signature);
  }
}
