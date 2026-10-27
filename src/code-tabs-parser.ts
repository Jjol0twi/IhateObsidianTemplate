import { Lexer, type Token, type Tokens } from "marked";

export interface CodeExample {
  readonly language: string;
  readonly label: string;
  readonly code: string;
}

export function parseCodeExamples(source: string): readonly CodeExample[] {
  const examples: CodeExample[] = [];
  const tokens = new Lexer({ gfm: false }).lex(source);

  for (const token of tokens) {
    if (token.type === "space") {
      continue;
    }
    if (!isFencedCode(token)) {
      throw new Error("Code tabs must contain only fenced code blocks.");
    }

    const info = token.lang?.trim() ?? "";
    const [language = "text"] = info.split(/\s+/).filter(Boolean);
    if (!/^[a-z0-9_+#.-]+$/i.test(language)) {
      throw new Error("Invalid code language. Use a language ID such as kotlin or python.");
    }

    examples.push({
      language: language.toLowerCase(),
      label: info.slice(language.length).trim() || language,
      code: token.text
    });
  }

  if (examples.length === 0) {
    throw new Error("Add at least one fenced code block inside ihate-template-code.");
  }

  return examples;
}

function isFencedCode(token: Token): token is Tokens.Code {
  return token.type === "code" && token.codeBlockStyle !== "indented";
}
