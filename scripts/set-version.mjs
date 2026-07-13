import { readFile, writeFile } from "node:fs/promises";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("Usage: npm run version:set -- <version>");
}

const [packageJson, packageLock, manifest, versions] = await Promise.all([
  readJson("package.json"),
  readJson("package-lock.json"),
  readJson("manifest.json"),
  readJson("versions.json")
]);

packageJson.version = version;
packageLock.version = version;
packageLock.packages[""].version = version;
manifest.version = version;
versions[version] = manifest.minAppVersion;

await Promise.all([
  writeJson("package.json", packageJson),
  writeJson("package-lock.json", packageLock),
  writeJson("manifest.json", manifest),
  writeJson("versions.json", versions)
]);

console.log(`IhateTemplate version set to ${version}.`);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
