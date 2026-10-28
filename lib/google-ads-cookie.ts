import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { ADS_TTL, parseAdClick, type AdClick } from "@/lib/google-ads-consent";

export type AdsConsent = { choice: "granted" | "denied"; at: number; id: string; click: AdClick | null };
const context = Buffer.from("clearcme-ads-consent-v1");

export function newAdsConsent(choice: AdsConsent["choice"], click: AdClick | null, at = Date.now()): AdsConsent {
  return { choice, at, id: randomUUID(), click: choice === "granted" ? click : null };
}

export function sealAdsConsent(value: AdsConsent, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(context);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function readAdsConsent(raw: string | undefined, key: string, now = Date.now()): AdsConsent | null {
  if (!raw || raw.length > 1600 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const buffer = Buffer.from(raw, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), buffer.subarray(0, 12));
    decipher.setAAD(context);
    decipher.setAuthTag(buffer.subarray(12, 28));
    const value = JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString("utf8"));
    if (!["granted", "denied"].includes(value.choice) || !Number.isSafeInteger(value.at) || value.at > now || now - value.at >= ADS_TTL * 1000 || !/^[a-f0-9-]{36}$/.test(value.id)) return null;
    const click = parseAdClick(value.click);
    if (value.click !== null && !click) return null;
    return { choice: value.choice, at: value.at, id: value.id, click: value.choice === "granted" ? click : null };
  } catch { return null; }
}
