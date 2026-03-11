export interface WebhookHandler<TPayload = unknown> {
  handleWebhook(payload: TPayload): Promise<void>;
}
