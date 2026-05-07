import dailyNote from "../templates/Daily Note.md";
import meetingNote from "../templates/Meeting Note.md";
import summaryNote from "../templates/Summary Note.md";
import testAllElements from "../templates/Test All Elements.md";

export type DefaultTemplateName =
  | "Daily Note.md"
  | "Meeting Note.md"
  | "Summary Note.md"
  | "Test All Elements.md";

export interface DefaultTemplate {
  fileName: DefaultTemplateName;
  content: string;
}

export const DEFAULT_TEMPLATES: readonly DefaultTemplate[] = [
  {
    fileName: "Daily Note.md",
    content: dailyNote
  },
  {
    fileName: "Meeting Note.md",
    content: meetingNote
  },
  {
    fileName: "Summary Note.md",
    content: summaryNote
  },
  {
    fileName: "Test All Elements.md",
    content: testAllElements
  }
];
