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

  async getChannelMemberIds(
    channelType: string,
    channelId: string,
  ): Promise<string[]> {
    const channel = this.client.channel(channelType, channelId);
    const response = await channel.query({
      state: true,
      watch: false,
      presence: false,
    });

    return (response.members || [])
      .map((member) => member.user_id || member.user?.id)
      .filter((memberId): memberId is string => Boolean(memberId));
  }
}
