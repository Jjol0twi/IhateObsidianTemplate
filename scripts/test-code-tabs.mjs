import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Lexer } from "marked";
import { build } from "esbuild";

const result = await build({
  entryPoints: ["src/code-tabs-parser.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  write: false,
  logLevel: "silent"
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  result.outputFiles[0].text
).toString("base64")}`;
const { parseCodeExamples } = await import(moduleUrl);

test("languages and optional tab labels stay in source order", () => {
  assert.deepEqual(parseCodeExamples([
    "```Kotlin Main.kt",
    'println("Hello")',
    "```",
    "",
    "```python",
    'print("Hello")',
    "```",
    "```kotlin User.kt",
    "data class User(val name: String)",
    "```"
  ].join("\n")), [
    { language: "kotlin", label: "Main.kt", code: 'println("Hello")' },
    { language: "python", label: "python", code: 'print("Hello")' },
    { language: "kotlin", label: "User.kt", code: "data class User(val name: String)" }
  ]);
});

test("blank and unknown languages remain valid text examples", () => {
  assert.deepEqual(parseCodeExamples("```\n\n```"), [
    { language: "text", label: "text", code: "" }
  ]);
  assert.equal(parseCodeExamples("```not-a-language\nhello\n```")[0].language, "not-a-language");
});

test("standard fences preserve nested backticks, indentation, and blank lines", () => {
  const source = [
    "````markdown README.md",
    "```js",
    "  const example = 1;",
    "",
    "```",
    "````",
    "~~~python",
    "if True:",
    "    print('hello')",
    "~~~"
  ].join("\r\n");
  const examples = parseCodeExamples(source);
  assert.equal(examples.length, 2);
  assert.equal(examples[0].code, "```js\n  const example = 1;\n\n```");
  assert.equal(examples[1].code, "if True:\n    print('hello')");
});

test("HTML and plugin-language examples are data, not rendered Markdown", () => {
  const code = '<script>alert("example")</script>\n<img src=x onerror=alert(1)>';
  const examples = parseCodeExamples(`\`\`\`html <img src=x>\n${code}\n\`\`\``);
  assert.equal(examples[0].label, "<img src=x>");
  assert.equal(examples[0].code, code);
  assert.equal(
    parseCodeExamples("```dataviewjs\nthrow new Error('never execute');\n```")[0].code,
    "throw new Error('never execute');"
  );
});

test("invalid structure is rejected rather than silently discarded", () => {
  for (const source of ["", "   \n", "only prose", "    indented code", "# Heading\n```js\nx\n```", "<div>HTML</div>"]) {
    assert.throws(() => parseCodeExamples(source));
  }
  assert.throws(() => parseCodeExamples("```bad\"language\ncode\n```"), /Invalid code language/);
});

test("the documented sample is one outer block with three code tabs", async () => {
  const source = await readFile("examples/Code Tabs.md", "utf8");
  const blocks = new Lexer().lex(source).filter((token) => token.type === "code");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].lang, "ihate-template-code");
  assert.deepEqual(
    parseCodeExamples(blocks[0].text).map((example) => example.language),
    ["kotlin", "python", "typescript"]
  );
});
