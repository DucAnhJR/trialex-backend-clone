export enum QueueName {
  EMAIL = 'email',
  SMS = 'sms',
  NOTIFICATION = 'notification',
}

export enum QueuePrefix {
  AUTH = 'auth',
}

export enum JobName {
  EMAIL_VERIFICATION = 'email-verification',
  SMS_VERIFICATION = 'sms-verification',
  EMAIL_FORGOT_PASSWORD = 'email-forgot-password',
  SEND_PUSH_NOTIFICATION_MESSAGE = 'send-push-notification-message',
}
