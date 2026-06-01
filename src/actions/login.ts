/**
 * Structured login action (username + password + submit), password masked.
 * @module actions/login
 */
import type { Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";
import { smartClick } from "./smart-click.js";
import { smartFill } from "./smart-fill.js";

/** Fields accepted by the login action (loose, like the Python dict). */
export interface LoginAction {
  usernameTarget?: string;
  passwordTarget?: string;
  submitTarget?: string;
  username?: string;
  password?: string;
}

/** Fill credentials then submit; masks the password in the report. */
export async function login(page: Page, action: LoginAction, humanMode = false): Promise<ActionResult> {
  const username = await smartFill(page, action.usernameTarget ?? "email", action.username ?? "", "", humanMode);
  const password = await smartFill(
    page,
    action.passwordTarget ?? "password",
    action.password ?? "",
    "",
    humanMode,
  );
  const submit = await smartClick(page, action.submitTarget ?? "Sign in", "", humanMode);
  const ok = Boolean(username.ok && password.ok && submit.ok);
  return { type: "login", ok, username, password: { ...password, value: "***" }, submit };
}
