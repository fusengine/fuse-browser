/**
 * Helpers système de fichiers et hash.
 * @module lib/fs
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Crée un dossier (récursif, idempotent). */
export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** Écrit un fichier en garantissant l'existence du dossier parent. */
export function writeFileEnsured(filePath: string, content: string): void {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, "utf-8");
}

/** Sérialise en JSON indenté et écrit le fichier. */
export function writeJson(filePath: string, value: unknown): void {
  writeFileEnsured(filePath, JSON.stringify(value, null, 2));
}

/** Lit et parse un JSON ; renvoie `fallback` en cas d'erreur/absence. */
export function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

/** SHA-1 hexadécimal d'une chaîne (signatures DOM, run ids — usage non cryptographique). */
export function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}
