import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const siteDir = path.join(rootDir, "site");

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  throw new Error(
    "Missing dist/index.html. Run `npx expo export --platform web` first."
  );
}

function replaceDir(src, dest) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(src, dest, { recursive: true });
}

replaceDir(path.join(distDir, "_expo"), path.join(siteDir, "_expo"));

// Vercel CLI ignores any nested `node_modules/` directory during upload.
// Copy `dist/assets/node_modules` directly into `site/assets/vendor` (paired with
// `/assets/node_modules/:path*` -> `/assets/vendor/:path*` in site/vercel.json)
// without creating/renaming a `node_modules` folder under `site/` (avoids Windows watcher EPERM).
const distAssetsDir = path.join(distDir, "assets");
const siteAssetsDir = path.join(siteDir, "assets");
if (fs.existsSync(siteAssetsDir)) {
  fs.rmSync(siteAssetsDir, { recursive: true, force: true });
}
fs.mkdirSync(siteAssetsDir, { recursive: true });
for (const entry of fs.readdirSync(distAssetsDir)) {
  const destName = entry === "node_modules" ? "vendor" : entry;
  fs.cpSync(
    path.join(distAssetsDir, entry),
    path.join(siteAssetsDir, destName),
    { recursive: true }
  );
}

const faviconSrc = path.join(distDir, "favicon.ico");
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, path.join(siteDir, "favicon.ico"));
}

let html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
html = html.replace(
  /<title>[\s\S]*?<\/title>/i,
  "<title>Bible Tabs — Web Reader</title>"
);
html = html.replace(
  /<link rel="icon" href="\/favicon\.ico"\s*\/>/i,
  '<link rel="icon" type="image/png" href="/icon.png" />'
);

fs.writeFileSync(path.join(siteDir, "read.html"), html, "utf8");

console.log(
  "Synced Expo Web Reader into site/ (read.html, _expo/, assets/ with vendor rewrite)."
);
