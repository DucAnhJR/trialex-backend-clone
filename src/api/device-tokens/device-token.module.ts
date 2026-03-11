import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceTokenController } from './device-token.controller';
import { DeviceTokenService } from './device-token.service';
import { DeviceToken, DeviceTokenSchema } from './schemas/device-tokens.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DeviceToken.name,
        schema: DeviceTokenSchema,
      },
    ]),
  ],
  providers: [DeviceTokenService],
  controllers: [DeviceTokenController],
  exports: [DeviceTokenService],
})
export class DeviceTokenModule {}
