import { compareVersions } from "compare-versions";

/** 构建来源：正式版、预发布（beta / rc 等）、nightly */
export type VersionChannel = "stable" | "prerelease" | "nightly";

// 提交号：git 的十六进制短号或全号，构建信息缺失时是 UNKNOWN
const COMMIT_RE = /^([0-9a-f]{7,40}|UNKNOWN)$/i;

/**
 * 面板里节点的版本字符串形如 `0.6.0-nightly.20261011-a1b2c3d`，即版本号后面拼着提交号。
 * 把两部分拆开；没有提交号时整串都是版本号。
 */
export function splitNodeVersion(raw: string): {
  version: string;
  commit: string;
} {
  const dash = raw.lastIndexOf("-");
  if (dash > 0 && COMMIT_RE.test(raw.slice(dash + 1))) {
    return { version: raw.slice(0, dash), commit: raw.slice(dash + 1) };
  }
  return { version: raw, commit: "" };
}

/**
 * 版本号的数字部分，去掉 `-rc.1`、`-nightly.…` 这类后缀。
 * 用于"版本太老"这类按功能判断的检查：`0.6.0-rc.1` 应该和 `0.6.0` 一样算有这些功能。
 */
export function coreVersion(version: string): string {
  return /^[^-+]*/.exec(version)?.[0] ?? version;
}

/**
 * 根据版本号后缀判断构建来源。
 * 没有后缀是正式版；后缀以 `nightly` 开头是 nightly；其余后缀（`rc.1`、`beta.2` 等）是预发布。
 */
export function getVersionChannel(version: string): VersionChannel {
  const dash = version.indexOf("-");
  if (dash < 0) {
    return "stable";
  }
  const suffix = version.slice(dash + 1);
  return /^nightly(\.|$)/.test(suffix) ? "nightly" : "prerelease";
}

/** a 是否比 b 旧。带后缀的版本比同号的正式版旧；任一方不是合法版本号时返回 false，不抛错。 */
export function isOlderVersion(a: string, b: string): boolean {
  try {
    return compareVersions(a, b) < 0;
  } catch {
    return false;
  }
}

/** 两个版本号是否完全相同（后缀也要相同）；任一方不是合法版本号时返回 false，不抛错。 */
export function isSameVersion(a: string, b: string): boolean {
  try {
    return compareVersions(a, b) === 0;
  } catch {
    return false;
  }
}
