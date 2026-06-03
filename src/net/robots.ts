/**
 * Minimal RFC 9309 robots.txt matcher (pure). Opt-in use only — fuse-browser
 * neither fetches nor honors robots.txt unless `respectRobots` is enabled.
 * @module net/robots
 */

/** A compiled robots.txt: whether a URL is allowed for a given user-agent. */
export interface RobotsMatcher {
  isAllowed(url: string, userAgent?: string): boolean;
}

interface Rule {
  allow: boolean;
  pattern: string;
}
interface Group {
  agents: string[];
  rules: Rule[];
}

/** Translate a robots pattern (`*` wildcard, `$` end-anchor) into a RegExp. */
function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = body
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(anchored ? `^${re}$` : `^${re}`);
}

/** Parse robots.txt text into ordered user-agent groups. */
function parseGroups(contents: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  for (const raw of contents.split(/\r?\n/)) {
    const line = (raw.split("#")[0] ?? "").trim();
    const colon = line.indexOf(":");
    if (colon === -1) {
      if (!line) current = null;
      continue;
    }
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (!current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && current && value) {
      current.rules.push({ allow: field === "allow", pattern: value });
    }
  }
  return groups;
}

/** Rules for `ua`: the exact-match group if present, else the `*` group. */
function rulesFor(groups: Group[], ua: string): Rule[] {
  const exact = groups.find((g) => g.agents.includes(ua));
  const star = groups.find((g) => g.agents.includes("*"));
  return (exact ?? star)?.rules ?? [];
}

/** Compile robots.txt `contents` into a {@link RobotsMatcher} (longest-match wins). */
export function parseRobots(contents: string): RobotsMatcher {
  const groups = parseGroups(contents);
  return {
    isAllowed(url: string, userAgent = "*"): boolean {
      let path = "/";
      try {
        const u = new URL(url);
        path = decodeURIComponent(u.pathname) + u.search;
      } catch {
        /* malformed URL → evaluate against "/" */
      }
      let best: { allow: boolean; len: number } | null = null;
      for (const rule of rulesFor(groups, userAgent.toLowerCase())) {
        if (!patternToRegExp(rule.pattern).test(path)) continue;
        const len = rule.pattern.replace(/[*$]/g, "").length;
        if (!best || len > best.len || (len === best.len && rule.allow)) {
          best = { allow: rule.allow, len };
        }
      }
      return best ? best.allow : true;
    },
  };
}
