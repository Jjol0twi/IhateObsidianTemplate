import dailyNote from "../templates/Daily Note.md";
import meetingNote from "../templates/Meeting Note.md";
import summaryNote from "../templates/Summary Note.md";
import testAllElements from "../templates/Test All Elements.md";
import dailyNoteRule from "../templates/Daily Note.ihate.json";
import meetingNoteRule from "../templates/Meeting Note.ihate.json";
import summaryNoteRule from "../templates/Summary Note.ihate.json";
import testAllElementsRule from "../templates/Test All Elements.ihate.json";
import type { TemplateRule } from "./template-rules";

export type DefaultTemplateName =
  | "Daily Note.md"
  | "Meeting Note.md"
  | "Summary Note.md"
  | "Test All Elements.md";

export interface DefaultTemplate {
  fileName: DefaultTemplateName;
  content: string;
  rule: TemplateRule;
}

export const DEFAULT_TEMPLATES: readonly DefaultTemplate[] = [
  {
    fileName: "Daily Note.md",
    content: dailyNote,
    rule: dailyNoteRule as TemplateRule
  },
  {
    fileName: "Meeting Note.md",
    content: meetingNote,
    rule: meetingNoteRule as TemplateRule
  },
  {
    fileName: "Summary Note.md",
    content: summaryNote,
    rule: summaryNoteRule as TemplateRule
  },
  {
    fileName: "Test All Elements.md",
    content: testAllElements,
    rule: testAllElementsRule as TemplateRule
  }
];
