import "dotenv/config";
import { randomUUID } from "node:crypto";
import { objectStorage } from "../libs/objectStorage.js";
const key = `smoke/${randomUUID()}.txt`;
const content = Buffer.from("TodoApp private storage roundtrip");
try {
  await objectStorage.put(key, content, "text/plain");
  const stream = await objectStorage.get(key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  if (!Buffer.concat(chunks).equals(content))
    throw new Error("Storage roundtrip mismatch");
  console.log("MinIO write/read verified; removing smoke object.");
} finally {
  await objectStorage.remove(key);
}
