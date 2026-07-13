import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { build } from "esbuild";

const result = await build({
  entryPoints: ["src/template-engine.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  define: {
    BUILD_MODE: JSON.stringify("test")
  },
  write: false,
  logLevel: "silent"
});

const source = result.outputFiles[0].text;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {
  getDateFormatFromDatetimeFormat,
  isValidDateForFormat,
  renderTemplate
} = await import(moduleUrl);

assert.equal(
  getDateFormatFromDatetimeFormat("DD.MM.YYYY HH:mm"),
  "DD.MM.YYYY"
);
assert.equal(
  getDateFormatFromDatetimeFormat("HH:mm YYYY/MM/DD"),
  "YYYY/MM/DD"
);
assert.equal(
  getDateFormatFromDatetimeFormat("YYYY-MM-DDTHH:mm"),
  "YYYY-MM-DD"
);
assert.equal(
  getDateFormatFromDatetimeFormat("YYYY-DD HH:mm"),
  "YYYY.MM.DD"
);
assert.equal(isValidDateForFormat("07.05.2026", "DD.MM.YYYY"), true);
assert.equal(isValidDateForFormat("31.02.2026", "DD.MM.YYYY"), false);
assert.equal(isValidDateForFormat("2026/02/29", "YYYY/MM/DD"), false);
assert.equal(isValidDateForFormat("2024/02/29", "YYYY/MM/DD"), true);

const title = `A "quoted" and O'Brien\\path`;
const rendered = renderTemplate(
  [
    "---",
    'double: "%{{title}}"',
    "single: '%{{title}}'",
    "tags: %{{tags}}",
    "created: '%{{datetime}}'",
    "owner: '%{{title}}'",
    "---",
    "## %{{title}}"
  ].join("\n"),
  {
    title,
    tags: ["back-end", "aws"],
    datetimeFormat: "DD.MM.YYYY HH:mm",
    now: new Date(2026, 4, 7, 10, 3),
    protectedFieldNames: ["owner"]
  }
);

assert.match(rendered.content, /double: "A \\"quoted\\" and O'Brien\\\\path"/);
assert.match(rendered.content, /single: 'A "quoted" and O''Brien\\path'/);
assert.match(rendered.content, /tags:\s*\n  - "back-end"\n  - "aws"/);
assert.match(rendered.content, /created: '07\.05\.2026 10:03'/);
assert.ok(rendered.content.endsWith(`## ${title}`));
assert.equal(rendered.protectedFields.created, "07.05.2026 10:03");
assert.equal(rendered.protectedFields.owner, title);

assert.throws(
  () => renderTemplate('tags: "%{{tags}}"', {
    title: "Page",
    tags: ["aws"],
    datetimeFormat: "YYYY.MM.DD.HH:mm"
  }),
  /must not be quoted/
);

const ruleResult = await build({
  entryPoints: ["src/template-rules.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  define: {
    BUILD_MODE: JSON.stringify("test")
  },
  plugins: [{
    name: "obsidian-test-stub",
    setup(builder) {
      builder.onResolve({ filter: /^obsidian$/ }, () => ({
        path: "obsidian",
        namespace: "obsidian-test"
      }));
      builder.onLoad({ filter: /.*/, namespace: "obsidian-test" }, () => ({
        loader: "js",
        contents: [
          "export class App {}",
          "export class Modal {}",
          "export class Setting {}",
          "export class TFile {}",
          "export class TFolder {}",
          "export class SuggestModal {}",
          "export class Notice {}",
          "export const normalizePath = (value) => value;",
          "export const getAllTags = () => [];",
          "export const setIcon = () => {};"
        ].join("\n")
      }));
    }
  }],
  write: false,
  logLevel: "silent"
});

const ruleModuleUrl = `data:text/javascript;base64,${Buffer.from(
  ruleResult.outputFiles[0].text
).toString("base64")}`;
const { getTemplateRulePath, parseTemplateRule } = await import(ruleModuleUrl);
const templateFiles = await readdir("templates");
const ruleFiles = templateFiles.filter((file) => file.endsWith(".ihate.json"));

for (const ruleFile of ruleFiles) {
  const markdownFile = ruleFile.replace(/\.ihate\.json$/, ".md");
  assert.ok(templateFiles.includes(markdownFile), `${ruleFile} has no markdown template`);
  assert.equal(getTemplateRulePath(`_templates/${markdownFile}`), `_templates/${ruleFile}`);

  const [ruleSource, markdown] = await Promise.all([
    readFile(`templates/${ruleFile}`, "utf8"),
    readFile(`templates/${markdownFile}`, "utf8")
  ]);
  const rule = parseTemplateRule(ruleSource, ruleFile);

  for (const property of rule.requiredProperties) {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(markdown, new RegExp(`^${escaped}:`, "m"));
  }
  for (const prompt of rule.prompts) {
    assert.ok(
      markdown.includes(`%{{field:${prompt.field}}}`),
      `${ruleFile} prompt ${prompt.field} is not used by its template`
    );
  }
}

assert.throws(
  () => parseTemplateRule('{"version":1,"execute":"alert(1)"}'),
  /unsupported field/
);
assert.throws(
  () => parseTemplateRule(JSON.stringify({
    version: 1,
    prompts: [
      { field: "priority", type: "select", options: [{ label: "A", value: "a" }] },
      { field: "priority", type: "date" }
    ]
  })),
  /duplicate prompt field/
);

const tagResult = await build({
  entryPoints: ["src/tag-values.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  write: false,
  logLevel: "silent"
});
const tagModuleUrl = `data:text/javascript;base64,${Buffer.from(
  tagResult.outputFiles[0].text
).toString("base64")}`;
const { getTagIdentity, normalizeTagValue } = await import(tagModuleUrl);
assert.equal(normalizeTagValue("  Back End  "), "Back-End");
assert.equal(normalizeTagValue("#aws"), "aws");
assert.equal(getTagIdentity("back-end"), getTagIdentity("Backend"));
assert.equal(getTagIdentity("back_end"), getTagIdentity("back end"));

console.log("Core template, rule, and tag tests passed.");
