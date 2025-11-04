import fs from "fs";

const manifestPath = "dist/manifest.json";
const assetsDir = "dist/assets";

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const files = fs.readdirSync(assetsDir);

manifest.background.service_worker = "assets/" + files.find(f => f.startsWith("background-"));

// Update content script reference to use content.js (without hash)
if (manifest.content_scripts && manifest.content_scripts.length > 0) {
  const contentScript = manifest.content_scripts[0];
  if (contentScript.js && contentScript.js.length > 0) {
    contentScript.js = ["assets/content.js"];
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
