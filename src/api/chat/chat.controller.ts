import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ChatService } from './chat.service';

@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('token')
  @ApiAuth({
    summary: 'Get Chat Token',
    description: 'Generates a chat token for the current user.',
  })
  getToken(@CurrentUser('id') userId: Types.ObjectId) {
    return this.chatService.createToken(userId);
  }
}
