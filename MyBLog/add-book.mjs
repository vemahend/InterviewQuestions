import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const booksRoot = resolve(projectRoot, "Books");
const args = process.argv.slice(2);
const positional = args.filter((value, index) => !value.startsWith("--") && !args[index - 1]?.startsWith("--"));
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "book";

if (!positional[0] || args.includes("--help")) {
  console.log(`
Add a Markdown book and its images to the library.

Usage:
  node add-book.mjs <book.md> [image-folder]
    [--title "Book title"] [--author "Author"] [--description "Description"] [--mark "BK"]

Examples:
  node add-book.mjs "/path/MyBook.md" "/path/MyBook Images"
  node add-book.mjs "/path/MyBook.md" "/path/images" --author "Jane Doe"

The importer creates Books/<book-name>/book.md and Books/<book-name>/images/,
then rebuilds index.html, all readers, and dist/.
`);
  process.exit(args.includes("--help") ? 0 : 1);
}

const sourceMarkdown = resolve(positional[0]);
if (!existsSync(sourceMarkdown) || !statSync(sourceMarkdown).isFile() || extname(sourceMarkdown).toLowerCase() !== ".md") {
  throw new Error(`Markdown file not found: ${sourceMarkdown}`);
}

let sourceImages = positional[1] ? resolve(positional[1]) : resolve(dirname(sourceMarkdown), "images");
if (!existsSync(sourceImages)) sourceImages = null;
if (sourceImages && !statSync(sourceImages).isDirectory()) throw new Error(`Image path is not a folder: ${sourceImages}`);

const slug = slugify(basename(sourceMarkdown, extname(sourceMarkdown)));
const destination = resolve(booksRoot, slug);
if (existsSync(destination)) {
  throw new Error(`Book already exists: ${destination}\nRename the Markdown file or remove the existing book folder first.`);
}

let markdown = readFileSync(sourceMarkdown, "utf8");
const suppliedMetadata = {
  title: option("title"),
  author: option("author"),
  description: option("description"),
  mark: option("mark"),
};
if (!markdown.startsWith("---\n") && Object.values(suppliedMetadata).some(Boolean)) {
  const frontMatter = Object.entries(suppliedMetadata)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${String(value).replace(/\n/g, " ")}`)
    .join("\n");
  markdown = `---\n${frontMatter}\n---\n\n${markdown}`;
}

mkdirSync(destination, { recursive: false });
writeFileSync(resolve(destination, "book.md"), markdown);
if (sourceImages) cpSync(sourceImages, resolve(destination, "images"), { recursive: true });

console.log(`Imported source: Books/${slug}/book.md`);
console.log(`Images copied: ${sourceImages ? `Books/${slug}/images/` : "none"}`);
execFileSync(process.execPath, [resolve(projectRoot, "build-static.mjs")], { cwd: projectRoot, stdio: "inherit" });
console.log("Book import complete. Open index.html to view the updated library.");
