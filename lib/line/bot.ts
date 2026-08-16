import { messagingApi, validateSignature as lineValidateSignature } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

export const lineClient = new MessagingApiClient({
  channelAccessToken,
});

/**
 * Validates HMAC SHA256 signature from LINE Webhook header x-line-signature
 */
export function validateSignature(body: string, signature: string): boolean {
  if (!channelSecret || !signature) return false;
  try {
    return lineValidateSignature(body, channelSecret, signature);
  } catch (err) {
    console.error('LINE signature validation error:', err);
    return false;
  }
}
