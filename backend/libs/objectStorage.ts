import { Client } from "minio";
import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import { readStorageConfig } from "../config/storage.js";
import { AppError } from "../error/AppError.js";
import { ATTACHMENT_ERROR } from "../error/definitions/attachmentErrors.js";
let cached: { configKey: string; client: Client; bucket: string } | undefined;
function storage() {
  const config = readStorageConfig();
  if (!config) throw new AppError(ATTACHMENT_ERROR.UNAVAILABLE);
  const configKey = JSON.stringify(config);
  if (cached?.configKey === configKey) return cached;
  const endpoint = new URL(config.endpoint);
  const useSSL = endpoint.protocol === "https:";
  const client = new Client({
    endPoint: endpoint.hostname,
    port: Number(endpoint.port || (useSSL ? 443 : 80)),
    useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
    transportAgent: useSSL
      ? new HttpsAgent({ timeout: 30_000 })
      : new HttpAgent({ timeout: 30_000 }),
  });
  cached = { configKey, client, bucket: config.bucket };
  return cached;
}
export const objectStorage = {
  async put(key: string, data: Buffer, mimeType: string) {
    const { client, bucket } = storage();
    await client.putObject(bucket, key, data, data.length, {
      "Content-Type": mimeType,
    });
  },
  async get(key: string) {
    const { client, bucket } = storage();
    return client.getObject(bucket, key);
  },
  async remove(key: string) {
    const { client, bucket } = storage();
    await client.removeObject(bucket, key);
  },
};
