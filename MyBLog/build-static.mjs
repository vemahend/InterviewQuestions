import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const output = resolve(root, "dist");

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const markdown = readFileSync(
  resolve(root, "UNIQUE_INTERVIEW_QUESTIONS_BY_TECHNOLOGY.md"),
  "utf8",
);
const answers = readFileSync(resolve(root, "ANSWERS.md"), "utf8");
const template = readFileSync(resolve(root, "index.template.html"), "utf8");
const markdownMarker = "const embeddedMarkdown = null;";
const answersMarker = "const embeddedAnswers = null;";

if (!template.includes(markdownMarker) || !template.includes(answersMarker)) {
  throw new Error("Question or answer data marker is missing from index.template.html");
}

const embeddedMarkdown = JSON.stringify(markdown).replaceAll("<", "\\u003c");
const embeddedAnswers = JSON.stringify(answers).replaceAll("<", "\\u003c");
const html = template
  .replace(markdownMarker, `const embeddedMarkdown = ${embeddedMarkdown};`)
  .replace(answersMarker, `const embeddedAnswers = ${embeddedAnswers};`);
writeFileSync(resolve(root, "index.html"), html);
writeFileSync(resolve(output, "index.html"), html);

console.log("Self-contained index.html and static site prepared");
