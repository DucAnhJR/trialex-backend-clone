import { AllConfigType } from '@/config/config.type';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseConfig {
  private readonly logger = new Logger(FirebaseConfig.name);
  private messaging?: Messaging;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    this.initialize();
  }

  getMessaging(): Messaging | undefined {
    return this.messaging;
  }

  private initialize(): void {
    const serviceAccountKey = this.configService.get('noti.serviceAccountKey', {
      infer: true,
    });

    if (!serviceAccountKey) {
      this.logger.warn(
        'SERVICE_ACCOUNT_KEY is not configured. FCM push notifications are disabled.',
      );
      return;
    }

    try {
      const serviceAccount = this.parseServiceAccount(serviceAccountKey);

      const app =
        getApps().length > 0
          ? getApps()[0]
          : initializeApp({
              credential: cert(serviceAccount),
            });

      this.messaging = getMessaging(app);
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  private parseServiceAccount(value: string): ServiceAccount {
    const json = value.trim().startsWith('{')
      ? value
      : Buffer.from(value, 'base64').toString('utf8');

    const parsed = JSON.parse(json) as ServiceAccount;

    if (typeof parsed.privateKey === 'string') {
      parsed.privateKey = parsed.privateKey.replace(/\\n/g, '\n');
    }

    return parsed;
  }
}
