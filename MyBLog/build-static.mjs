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
const template = readFileSync(resolve(root, "index.template.html"), "utf8");
const marker = "const embeddedMarkdown = null;";

if (!template.includes(marker)) {
  throw new Error("Question-data marker is missing from index.html");
}

const embeddedData = JSON.stringify(markdown).replaceAll("<", "\\u003c");
const html = template.replace(marker, `const embeddedMarkdown = ${embeddedData};`);
writeFileSync(resolve(root, "index.html"), html);
writeFileSync(resolve(output, "index.html"), html);

console.log("Self-contained index.html and static site prepared");
