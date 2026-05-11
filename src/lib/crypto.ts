import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

const DEFAULT_KEY = "weekly-report-default-encryption-key-v1";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const [ivHex, tagHex, encrypted] = encoded.split(":");
  if (!ivHex || !tagHex || !encrypted) throw new Error("Invalid encrypted data");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
