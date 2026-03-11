import { ChatModule } from '@/api/chat/chat.module';
import { User, UserSchema } from '@/api/users/schemas/user.schema';
import { EmailQueueModule } from '@/background/queues/email/email-queue.module';
import { SmsQueueModule } from '@/background/queues/sms/sms-queue.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import * as fs from 'fs';
import path from 'path';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Session, SessionSchema } from './schemas/session.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Session.name,
        schema: SessionSchema,
      },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: () => ({
        privateKey: fs.readFileSync(
          path.resolve(process.cwd(), 'secrets/private.key'),
        ),
        publicKey: fs.readFileSync(
          path.resolve(process.cwd(), 'secrets/public.key'),
        ),
        signOptions: {
          algorithm: 'RS256',
        },
        verifyOptions: {
          algorithms: ['RS256'],
        },
      }),
    }),
    SmsQueueModule,
    EmailQueueModule,
    ChatModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
