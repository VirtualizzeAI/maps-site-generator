import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password:string) {
  const salt=randomBytes(16).toString("hex");
  return `${salt}$${scryptSync(password,salt,64).toString("hex")}`;
}

export function verifyPassword(password:string, stored:string) {
  const [salt,expected]=stored.split("$");
  if(!salt||!expected) return false;
  const actual=scryptSync(password,salt,64);
  const expectedBuffer=Buffer.from(expected,"hex");
  return actual.length===expectedBuffer.length&&timingSafeEqual(actual,expectedBuffer);
}

export const hashToken=(token:string)=>createHash("sha256").update(token).digest("hex");
export const newToken=()=>randomBytes(48).toString("base64url");
