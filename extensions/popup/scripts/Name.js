import fs from "fs";

const manifestPath = "dist/manifest.json";
const assetsDir = "dist/assets";

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const files = fs.readdirSync(assetsDir);

manifest.background.service_worker = "assets/" + files.find(f => f.startsWith("background-"));


fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
