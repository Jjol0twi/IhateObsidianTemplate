import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const packageJson = await readJson("package.json");
const manifest = await readJson("manifest.json");
const versions = await readJson("versions.json");

assertEqual(packageJson.version, manifest.version, "package.json and manifest.json versions differ");
assertEqual(
  versions[manifest.version],
  manifest.minAppVersion,
  "versions.json does not map the manifest version to minAppVersion"
);

const builtMain = await readText("../.obsidian/plugins/ihate-template/main.js");
for (const disallowed of [
  "console.",
  "Health check",
  "development mode",
  "IhateTemplate unloaded"
]) {
  if (builtMain.includes(disallowed)) {
    throw new Error(`Release bundle contains development artifact: ${disallowed}`);
  }
}

if (manifest.id !== packageJson.name) {
  throw new Error("manifest id and package name should match for this plugin");
}

if (manifest.author.trim().length === 0) {
  throw new Error("manifest author is required before release");
}

console.log(`Release check passed for ${manifest.id}@${manifest.version}`);

async function readJson(path) {
  return JSON.parse(await readText(path));
}

async function readText(path) {
  return readFile(resolve(root, path), "utf8");
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}
