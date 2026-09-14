import { isAbsolute, relative, resolve } from "node:path";

export const resolveStaticPath = (root, requestUrl) => {
  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.split(/[?#]/, 1)[0]).replaceAll("\\", "/");
  } catch {
    return null;
  }
  const segments = pathname.split("/").filter(Boolean);
  if (pathname.includes("\0") || segments.some((segment) => segment === ".." || segment.startsWith("."))) return null;
  const target = resolve(root, pathname.replace(/^\/+/, ""));
  const pathFromRoot = relative(root, target);
  if (pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) return null;
  return target;
};
