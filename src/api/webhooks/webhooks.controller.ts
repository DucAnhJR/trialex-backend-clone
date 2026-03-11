import { ApiPublic } from '@/decorators/http.decorators';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('getstream')
  @ApiPublic()
  async handleGetStreamWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
    @Headers('x-signature') signature: string,
  ): Promise<{ success: boolean }> {
    try {
      if (!req.rawBody) {
        throw new BadRequestException(
          'Missing raw body for webhook signature verification',
        );
      }

      if (!signature) {
        throw new BadRequestException('Missing webhook signature');
      }

      if (
        !this.webhooksService.verifyWebhookSignature(req.rawBody, signature)
      ) {
        throw new BadRequestException('Invalid webhook signature');
      }

      await this.webhooksService.handleGetStreamWebhook(body);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
