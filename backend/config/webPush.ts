import {
  generateVAPIDKeys,
  sendNotification,
  setVapidDetails,
  type PushSubscription as WebPushLibSubscription,
  type RequestOptions,
  type SendResult,
} from "web-push";

const DEFAULT_VAPID_SUBJECT = "mailto:notifications@orbit-todo.click";

export interface WebPushConfig {
  supported: boolean;
  publicKey: string | null;
  privateKey: string | null;
  subject: string | null;
}

export interface PublicPushConfig {
  supported: boolean;
  publicKey: string | null;
}

let configuredKeySignature: string | null = null;

export const webPushTransport = {
  generateVAPIDKeys,
  sendNotification(
    subscription: WebPushLibSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions,
  ): Promise<SendResult> {
    return sendNotification(subscription, payload, options);
  },
};

export function getWebPushConfig(): WebPushConfig {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || null;
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || null;
  const subject = process.env.VAPID_SUBJECT?.trim() || DEFAULT_VAPID_SUBJECT;

  if (!publicKey || !privateKey) {
    return {
      supported: false,
      publicKey: null,
      privateKey: null,
      subject: null,
    };
  }

  return {
    supported: true,
    publicKey,
    privateKey,
    subject,
  };
}

export function getPublicPushConfig(): PublicPushConfig {
  const config = getWebPushConfig();
  return {
    supported: config.supported,
    publicKey: config.publicKey,
  };
}

export function configureWebPush(): boolean {
  const config = getWebPushConfig();
  if (
    !config.supported ||
    !config.publicKey ||
    !config.privateKey ||
    !config.subject
  ) {
    return false;
  }

  const signature = `${config.subject}|${config.publicKey}|${config.privateKey}`;
  if (configuredKeySignature !== signature) {
    try {
      setVapidDetails(config.subject, config.publicKey, config.privateKey);
      configuredKeySignature = signature;
    } catch {
      console.warn("[push] Invalid VAPID configuration; web push disabled");
      return false;
    }
  }

  return true;
}
