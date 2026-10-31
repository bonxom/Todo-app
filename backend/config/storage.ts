import { z } from "zod";
const schema = z.object({
  MINIO_ENDPOINT: z.url().refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  }, "Use an HTTP(S) origin without credentials or a path"),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
  MINIO_REGION: z.string().min(1).default("us-east-1"),
});
export function readStorageConfig(env: NodeJS.ProcessEnv = process.env) {
  if (
    ![
      "MINIO_ENDPOINT",
      "MINIO_ACCESS_KEY",
      "MINIO_SECRET_KEY",
      "MINIO_BUCKET",
    ].some((key) => Boolean(env[key]))
  )
    return null;
  const parsed = schema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      `Invalid MinIO configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  const value = parsed.data;
  return {
    endpoint: value.MINIO_ENDPOINT,
    accessKey: value.MINIO_ACCESS_KEY,
    secretKey: value.MINIO_SECRET_KEY,
    bucket: value.MINIO_BUCKET,
    region: value.MINIO_REGION,
  };
}
