const SCRIPTS = new Set(["hiragana", "katakana"]);

export function basePath(pathname = globalThis.location?.pathname ?? "/") {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] && !SCRIPTS.has(parts[0])) return `/${parts[0]}`;
  return "";
}

export function parseRoute(pathname = globalThis.location?.pathname ?? "/") {
  const base = basePath(pathname);
  let raw = pathname;
  if (base && (raw === base || raw.startsWith(`${base}/`))) {
    raw = raw.slice(base.length) || "/";
  }
  const parts = raw.replace(/\/+$/, "").split("/").filter(Boolean);
  const script = SCRIPTS.has(parts[0]) ? parts[0] : "home";
  if (script === "home") return { script: "home", view: "home" };
  return { script, view: parts[1] === "study" ? "study" : "setup" };
}

export function hrefFor(script, view = "setup", pathname = globalThis.location?.pathname ?? "/") {
  const base = basePath(pathname);
  if (script === "home") return `${base}/` || "/";
  if (view === "study") return `${base}/${script}/study`;
  return `${base}/${script}`;
}
