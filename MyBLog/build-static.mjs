import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const output = resolve(root, "dist");
const booksDirectory = resolve(root, "Books");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "book";

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(fullPath);
    return entry.isFile() && extname(entry.name).toLowerCase() === ".md" ? [fullPath] : [];
  }).sort();
}

function uniqueBookFiles(directory) {
  const booksByContent = new Map();
  for (const filePath of markdownFiles(directory)) {
    const markdown = readFileSync(filePath, "utf8");
    const frontMatter = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    const content = frontMatter ? markdown.slice(frontMatter[0].length) : markdown;
    const fingerprint = createHash("sha256").update(content.trim()).digest("hex");
    const current = booksByContent.get(fingerprint);
    if (!current || (frontMatter && !current.frontMatter)) {
      booksByContent.set(fingerprint, { filePath, frontMatter: Boolean(frontMatter) });
    }
  }
  return [...booksByContent.values()].map(({ filePath }) => filePath).sort();
}

function formatCsharpInDepthChapter(markdown) {
  const lines = markdown.split(/\r?\n/);
  const formatted = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\[← Table of contents\]/.test(line.trim())) continue;
    if (/^>\s*Source:\s*C# in Depth/i.test(line.trim())) continue;

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      let nextIndex = index + 1;
      while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1;
      const continuation = lines[nextIndex]?.match(new RegExp(`^${heading[1]}\\s+([a-z].*)$`));
      if (continuation) {
        formatted.push(`${heading[1]} ${heading[2]} ${continuation[1]}`);
        index = nextIndex;
        continue;
      }
    }

    const listing = line.trim().match(/^Listing\s+(\d+\.\d+)\s*$/i);
    if (listing) {
      let captionIndex = index + 1;
      while (captionIndex < lines.length && !lines[captionIndex].trim()) captionIndex += 1;
      const caption = lines[captionIndex]?.trim();
      formatted.push(`LISTING ${listing[1].replace(".", "-")}${caption ? ` — ${caption}` : ""}`);
      index = captionIndex;
      continue;
    }

    const numberedHeading = line.trim().match(/^(\d+(?:\.\d+)+)\s*$/);
    if (numberedHeading) {
      let titleIndex = index + 1;
      while (titleIndex < lines.length && !lines[titleIndex].trim()) titleIndex += 1;
      const title = lines[titleIndex]?.trim();
      if (title && !/^<!--/.test(title)) {
        const level = Math.min(4, numberedHeading[1].split(".").length + 1);
        formatted.push(`${"#".repeat(level)} ${numberedHeading[1]} ${title}`);
        index = titleIndex;
        continue;
      }
    }
    formatted.push(line);
  }
  const formattedMarkdown = formatAdaptiveMarkdown(formatted.join("\n"))
    .replace(/^### LISTING (\d+)-(\d+)(.*)$/gm, "### Listing $1.$2$3");
  const headings = new Set([...formattedMarkdown.matchAll(/^#{1,4}\s+(.+)$/gm)].map((match) => match[1].trim()));
  const normalized = [];
  let inCode = false;
  const normalizedLines = formattedMarkdown.split("\n");
  for (let index = 0; index < normalizedLines.length; index += 1) {
    const line = normalizedLines[index];
    if (/^```/.test(line.trim())) {
      inCode = !inCode;
      normalized.push(line);
      continue;
    }
    if (inCode) {
      normalized.push(line);
      continue;
    }
    if (/^\s*<!-- PDF page \d+ -->\s*$/.test(line)) {
      let nextIndex = index + 1;
      while (nextIndex < normalizedLines.length && !normalizedLines[nextIndex].trim()) nextIndex += 1;
      const next = normalizedLines[nextIndex]?.trim();
      if (next && headings.has(next)) {
        while (normalized.at(-1) === "") normalized.pop();
        index = nextIndex;
        while (index + 1 < normalizedLines.length && !normalizedLines[index + 1].trim()) index += 1;
      }
      continue;
    }
    if (/[A-Za-z]-$/.test(line) && /^[a-z]/.test(normalizedLines[index + 1]?.trim() || "")) {
      normalized.push(line.slice(0, -1) + normalizedLines[index + 1].trimStart());
      index += 1;
      continue;
    }
    normalized.push(line);
  }
  return normalized.join("\n");
}

function csharpInDepthSource(directory) {
  if (!existsSync(directory)) return null;
  const chapters = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^chapter-\d+$/.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map((entry) => {
      const filePath = resolve(directory, entry.name, "chapter.md");
      if (!existsSync(filePath)) return null;
      const markdown = formatCsharpInDepthChapter(readFileSync(filePath, "utf8")
        .replace(/\]\(images\//g, `](images/${entry.name}/images/`));
      return markdown;
    })
    .filter(Boolean);
  if (!chapters.length) return null;
  return {
    filePath: resolve(directory, "CSharp in Depth.md"),
    imageSource: directory,
    markdown: [
      "---",
      "title: C# in Depth, Third Edition",
      "author: Jon Skeet",
      "description: A chapter-by-chapter guide to the evolution of C#, from generics and LINQ to dynamic binding and async/await.",
      "mark: C#",
      "chapter-level: 1",
      "---",
      "",
      ...chapters,
    ].join("\n"),
  };
}

function metadataFromMarkdown(markdown, filePath) {
  const frontMatter = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  const metadata = {};
  if (frontMatter) {
    for (const line of frontMatter[1].split("\n")) {
      const match = line.match(/^([\w-]+):\s*(.+)$/);
      if (match) metadata[match[1].toLowerCase()] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  const body = frontMatter ? markdown.slice(frontMatter[0].length) : markdown;
  const title = metadata.title || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || basename(filePath, extname(filePath));
  const earlyBody = body.slice(0, 6000);
  const author = metadata.author || earlyBody.match(/^##\s+(?!Chapter\b|Part\b)([^\n]{2,100})$/im)?.[1]?.trim() || "Markdown book";
  const description = metadata.description || `Read ${title} chapter by chapter.`;
  const chapterLevel = Math.max(1, Math.min(6, Number(metadata["chapter-level"]) || 2));
  return { title, author, description, chapterLevel, mark: metadata.mark, body };
}

function bookMark(meta) {
  if (meta.mark) return String(meta.mark).trim().slice(0, 4).toUpperCase();
  if (/C#|CSharp/i.test(meta.title)) return "C#";
  if (/Amazon Web Services/i.test(meta.title)) return "AWS";
  const ignored = new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to", "via", "with", "edition"]);
  const words = meta.title.replace(/[^A-Za-z0-9+# ]/g, " ").split(/\s+/).filter((word) => word && !ignored.has(word.toLowerCase()));
  if (!words.length) return "BK";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

function genericSections(markdown, filePath) {
  const meta = metadataFromMarkdown(markdown, filePath);
  const lines = meta.body.replace(/\r/g, "").split("\n");
  const candidates = [];
  let offset = 0;
  let inCode = false;
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) inCode = !inCode;
    const match = !inCode && line.match(new RegExp(`^#{${meta.chapterLevel}}\\s+(.+)$`));
    if (match && !/^\[?\.\.\.\]?$/.test(match[1].trim())) candidates.push({ start: offset, title: match[1].trim() });
    offset += line.length + 1;
  }
  if (!candidates.length) return { meta, sections: [{ id: "complete-book", number: 1, partId: "book", part: meta.title, title: meta.title, markdown: meta.body }] };
  const sections = [];
  const opening = meta.body.slice(0, candidates[0].start).trim();
  if (opening.replace(/^#\s+.*$/m, "").trim()) sections.push({ id: "book-opening", number: "•", partId: "opening", part: "Book opening", title: "Introduction", markdown: opening });
  candidates.forEach((chapter, index) => {
    const end = candidates[index + 1]?.start ?? meta.body.length;
    sections.push({ id: `chapter-${index + 1}`, number: index + 1, partId: "chapters", part: meta.title, title: chapter.title, markdown: meta.body.slice(chapter.start, end).trim() });
  });
  return { meta, sections };
}

function reflowReactChapter(markdown, title) {
  const blocks = markdown.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  if (blocks[0] === "Chapter" && blocks[1] === "3.") blocks.splice(0, 8);

  const output = [`# Chapter 3. ${title}`];
  if (blocks.slice(0, 3).join(" ") === "This chapter covers") {
    output.push("", "### This chapter covers");
    blocks.splice(0, 3);
  }
  if (blocks[0] === "Mutable") {
    output.push("", "- Mutable and immutable state", "- Stateful and stateless components", "- Component communication", "- One-way data flow");
    blocks.splice(0, 13);
  }

  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) output.push("", paragraph.join(" "));
    paragraph = [];
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (/^<!-- Page \d+ -->$/.test(block) || /^!\[[^\]]*\]\([^)]+\)$/.test(block)) {
      flushParagraph();
      output.push("", block);
      continue;
    }

    const heading = block.match(/^(\d+(?:\.\d+)+\.?)\s*(.*)$/);
    if (heading) {
      flushParagraph();
      const headingParts = [heading[1], heading[2]].filter(Boolean);
      while (index + 1 < blocks.length && /^[A-Z][A-Z0-9 -]*$/.test(blocks[index + 1])) {
        headingParts.push(blocks[index + 1]);
        index += 1;
      }
      output.push("", `## ${headingParts.join(" ")}`);
      continue;
    }

    if (/^Listing\s+\d+\.\d+/i.test(block)) {
      flushParagraph();
      output.push("", `### ${block}`);
      continue;
    }
    if (/^Figure\s+\d+\.\d+/i.test(block)) {
      flushParagraph();
      output.push("", block);
      continue;
    }
    paragraph.push(block.replace(/\s+/g, " "));
  }
  flushParagraph();
  return output.join("\n");
}

function reactBookSections(markdown, filePath) {
  const meta = metadataFromMarkdown(markdown, filePath);
  const chaptersByNumber = new Map();
  for (const match of meta.body.matchAll(/^Chapter\s+(\d{1,2})\.\s+(.+)$/gm)) {
    const number = Number(match[1]);
    const previous = chaptersByNumber.get(number);
    chaptersByNumber.set(number, { match, title: previous?.title ?? match[2].trim() });
  }
  const chapters = [...chaptersByNumber.values()].sort((left, right) => left.match.index - right.match.index);
  if (chapters.length < 2) return genericSections(markdown, filePath);

  const sections = [];
  const opening = meta.body.slice(0, chapters[0].match.index).trim();
  if (opening.replace(/^#\s+.*$/m, "").trim()) {
    sections.push({ id: "book-opening", number: "•", partId: "opening", part: "Book opening", title: "Introduction", markdown: opening });
  }
  chapters.forEach((chapter, index) => {
    const number = Number(chapter.match[1]);
    const end = chapters[index + 1]?.match.index ?? meta.body.length;
    const title = chapter.title;
    const chapterMarkdown = meta.body.slice(chapter.match.index, end).trim();
    sections.push({
      id: `chapter-${number}`,
      number,
      partId: "chapters",
      part: meta.title,
      title,
      markdown: number === 3 ? reflowReactChapter(chapterMarkdown, title) : chapterMarkdown,
    });
  });
  return { meta, sections };
}

function formatAdaptiveMarkdown(source) {
  const normalizedBullets = source.replace(/(?:^■\s*\n){1,2}([^\n]+)/gm, "■ $1");
  const lines = normalizedBullets.split("\n");
  const result = [];
  const looksLikeProse = (line) => {
    const trimmed = line.trim();
    if (!trimmed || /^<!--|^!\[|^#{1,6}\s|^(?:FIGURE|CHAPTER|PART)\b/.test(trimmed)) return true;
    if (/^(?:\/\/|\/\*|\*|#|using\b|namespace\b|class\b|interface\b|public\b|private\b|protected\b|internal\b|static\b|return\b|throw\b|if\b|else\b|for\b|foreach\b|while\b|switch\b|case\b|break\b|var\b|new\b|this\b|async\b|await\b|Console\b|console\.|["']|\[|\{|\}|<|\$)/.test(trimmed)) return false;
    if (/[;{}=><]|\)\s*;?$/.test(trimmed)) return false;
    return trimmed.split(/\s+/).length >= 7;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^LISTING\s+[A-Z0-9-]+\b/.test(line.trim())) {
      result.push(line);
      continue;
    }
    result.push(`### ${line.trim()}`);
    while (index + 1 < lines.length && !lines[index + 1].trim()) index += 1;
    const code = [];
    while (index + 1 < lines.length) {
      const candidate = lines[index + 1];
      if (!candidate.trim()) {
        code.push(candidate);
        index += 1;
        continue;
      }
      if (/^<!-- Page\s+\d+ -->$/.test(candidate.trim())) {
        index += 1;
        continue;
      }
      if (code.some((value) => value.trim()) && looksLikeProse(candidate)) break;
      if (/^LISTING\s+/.test(candidate.trim())) break;
      code.push(candidate);
      index += 1;
    }
    while (code.length && !code.at(-1).trim()) code.pop();
    if (code.length) result.push("", "```csharp", ...code, "```");
  }
  return result.join("\n");
}

function extractedBookSections(markdown, filePath) {
  const meta = metadataFromMarkdown(markdown, filePath);
  const markers = [];
  for (const match of markdown.matchAll(/^PART\s+([IVXLCDM]+)\s*\n#\s+([^\n]+)$/gm)) {
    markers.push({ start: match.index, type: "part", label: match[1], title: match[2].trim() });
  }
  for (const match of markdown.matchAll(/^C H A P T E R\s+([0-9 ]+)\s*\n#\s+([^\n]+)$/gm)) {
    markers.push({ start: match.index, type: "chapter", number: Number(match[1].replace(/\s/g, "")), title: match[2].trim() });
  }
  for (const match of markdown.matchAll(/^A P P E N D I X\s+([A-Z])\s*\n#\s+([^\n]+)$/gm)) {
    markers.push({ start: match.index, type: "appendix", label: match[1], title: match[2].trim() });
  }
  markers.sort((a, b) => a.start - b.start);
  if (markers.filter((marker) => marker.type === "chapter").length < 2) return genericSections(markdown, filePath);

  const sections = [{
    id: "front-matter", number: "•", partId: "opening", part: "Book opening", title: "Introduction",
    markdown: formatAdaptiveMarkdown(markdown.slice(0, markers[0].start).trim()),
  }];
  let currentPart = "Book";
  markers.forEach((marker, index) => {
    const end = markers[index + 1]?.start ?? markdown.length;
    let content = markdown.slice(marker.start, end).trim();
    if (marker.type === "part") {
      currentPart = `Part ${marker.label} · ${marker.title}`;
      content = content.replace(/^PART\s+[IVX]+\s*\n#\s+[^\n]+\s*/, `# ${marker.title}\n\n`);
      sections.push({ id: `part-${marker.label.toLowerCase()}`, number: `P${marker.label}`, partId: `part-${marker.label}`, part: currentPart, title: marker.title, markdown: formatAdaptiveMarkdown(content) });
    } else if (marker.type === "chapter") {
      content = content.replace(/^C H A P T E R\s+[0-9 ]+\s*\n#\s+[^\n]+\s*/, `# ${marker.title}\n\n`);
      sections.push({ id: `chapter-${marker.number}`, number: marker.number, partId: `chapter-${marker.number}`, part: currentPart, title: marker.title, markdown: formatAdaptiveMarkdown(content) });
    } else {
      content = content.replace(/^A P P E N D I X\s+[A-Z]\s*\n#\s+[^\n]+\s*/, `# ${marker.title}\n\n`);
      sections.push({ id: `appendix-${marker.label.toLowerCase()}`, number: marker.label, partId: "appendix", part: "Appendix", title: marker.title, markdown: formatAdaptiveMarkdown(content) });
    }
  });
  return { meta, sections };
}

function replaceReaderData(template, sections, meta) {
  const payload = JSON.stringify(sections).replaceAll("<", "\\u003c");
  return template
    .replace(/const sections=\[[\s\S]*?\];\n    function joinWrappedListItems/, `const sections=${payload};\n    function joinWrappedListItems`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)} · Book Reader</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(meta.description)}">`)
    .replace('<span class="brand-mark">AWS</span>', `<span class="brand-mark">${escapeHtml(bookMark(meta))}</span>`)
    .replace("<strong>AWS in Action</strong>", `<strong>${escapeHtml(meta.title)}</strong>`)
    .replace("<small>SECOND EDITION · READER</small>", `<small>${escapeHtml(meta.author)} · READER</small>`)
    .replace("Amazon Web Services<br>in Action", escapeHtml(meta.title))
    .replace("Michael Wittig & Andreas Wittig · 17 chapters", `${escapeHtml(meta.author)} · ${sections.length} sections`)
    .replace('<div class="tools">', '<div class="tools"><a class="tool" href="../../index.html" title="Back to library" style="display:grid;place-items:center;text-decoration:none">⌂</a>');
}

function parseEmbeddedSections(html) {
  const match = html.match(/const sections=(\[[\s\S]*?\]);\n    function joinWrappedListItems/);
  if (!match) throw new Error("Could not read the prepared book sections");
  return JSON.parse(match[1]);
}

function questionPage() {
  const markdown = readFileSync(resolve(root, "UNIQUE_INTERVIEW_QUESTIONS_BY_TECHNOLOGY.md"), "utf8");
  const answerFilesDirectory = resolve(root, "Answers");
  const answerFiles = existsSync(answerFilesDirectory)
    ? readdirSync(answerFilesDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^Q-[a-f0-9]{16}_.+\.md$/i.test(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => {
        const content = readFileSync(resolve(answerFilesDirectory, entry.name), "utf8");
        const filenameId = entry.name.match(/^(Q-[a-f0-9]{16})_/i)?.[1];
        const targetId = content.match(/^<!--\s*bank-question-id:\s*(Q-[a-f0-9]{16})\s*-->\s*$/im)?.[1] || filenameId;
        const answer = content
          .replace(/^<!--\s*bank-question-id:[^\n]*-->\s*\n?/im, "")
          .replace(/^# Question ID:\s*Q-[a-f0-9]{16}\s*\n?/im, "");
        return `\n\n## ${targetId}\n${answer.trim()}`;
      })
    : [];
  const answers = [readFileSync(resolve(root, "ANSWERS.md"), "utf8"), ...answerFiles].join("\n");
  const template = readFileSync(resolve(root, "index.template.html"), "utf8");
  const markdownMarker = "const embeddedMarkdown = null;";
  const answersMarker = "const embeddedAnswers = null;";
  if (!template.includes(markdownMarker) || !template.includes(answersMarker)) throw new Error("Question data markers are missing");
  return template
    .replace(markdownMarker, `const embeddedMarkdown = ${JSON.stringify(markdown).replaceAll("<", "\\u003c")};`)
    .replace(answersMarker, `const embeddedAnswers = ${JSON.stringify(answers).replaceAll("<", "\\u003c")};`)
    .replace("<body>", `<body><a href="./index.html" aria-label="Back to library" style="position:fixed;right:18px;bottom:18px;z-index:100;padding:11px 15px;border-radius:999px;background:#b7f34a;color:#111a08;font:700 13px Inter,system-ui;text-decoration:none;box-shadow:0 12px 30px rgba(0,0,0,.3)">← Library</a>`);
}

function libraryPage(books, questionCount) {
  const cards = books.map((book, index) => `<a class="card book-card" href="readers/${encodeURI(book.fileName)}"><span class="cover cover-${index % 5}"><span>BOOK ${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(book.meta.title)}</strong><small>${escapeHtml(book.meta.author)}</small></span><span class="card-copy"><span class="label">${book.sectionCount} reading sections</span><strong>${escapeHtml(book.meta.title)}</strong><span>${escapeHtml(book.meta.description)}</span><em>Open book →</em></span></a>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#091326"><meta name="description" content="Interview preparation library and Markdown book collection."><title>Interview & Book Library</title><style>
:root{--bg:#091326;--surface:#101e34;--ink:#f0f5fc;--muted:#98a8bd;--line:#263955;--accent:#b7f34a;--blue:#78a9ff}*{box-sizing:border-box}body{margin:0;min-width:320px;background:radial-gradient(circle at 80% 0,rgba(75,125,255,.18),transparent 32rem),var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.shell{width:min(1220px,calc(100% - 40px));margin:auto}.top{display:flex;align-items:center;justify-content:space-between;padding:25px 0;border-bottom:1px solid rgba(255,255,255,.08)}.brand{display:flex;align-items:center;gap:12px}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--accent);color:#101b08;font-weight:900}.brand strong,.brand small{display:block}.brand small{color:var(--muted);font-size:.72rem}.count{color:var(--muted);font-size:.82rem}.hero{padding:76px 0 54px}.eyebrow,.label{color:var(--accent);font-size:.69rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.hero h1{max-width:820px;margin:10px 0 18px;font-size:clamp(2.7rem,7vw,6.3rem);line-height:.93;letter-spacing:-.065em}.hero p{max-width:650px;margin:0;color:var(--muted);font-size:1.04rem;line-height:1.7}.section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:26px 0 18px}.section-head h2{margin:0;font-size:1.45rem}.section-head span{color:var(--muted);font-size:.8rem}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{display:flex;min-height:260px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015));color:inherit;text-decoration:none;overflow:hidden;transition:transform .18s,border-color .18s,box-shadow .18s}.card:hover{transform:translateY(-4px);border-color:#4a668e;box-shadow:0 24px 60px rgba(0,0,0,.24)}.question-card{grid-column:1/-1;min-height:220px}.question-visual{display:grid;place-items:center;width:34%;min-width:250px;background:linear-gradient(135deg,#b7f34a,#73be40);color:#102008}.question-visual strong{font-size:clamp(3rem,7vw,6rem);line-height:1}.question-visual small{display:block;text-align:center;font-weight:800;letter-spacing:.1em}.card-copy{display:flex;flex:1;flex-direction:column;align-items:flex-start;padding:32px}.card-copy>strong{margin:9px 0;font-size:1.5rem;line-height:1.15}.card-copy>span:not(.label){color:var(--muted);line-height:1.55}.card-copy em{margin-top:auto;padding-top:24px;color:var(--blue);font-size:.85rem;font-style:normal;font-weight:750}.book-card{align-items:stretch}.cover{display:flex;width:190px;min-width:190px;padding:22px;flex-direction:column;background:#174b48;color:#fff;box-shadow:inset -10px 0 20px rgba(0,0,0,.14)}.cover span{font-size:.63rem;font-weight:800;letter-spacing:.14em}.cover strong{margin:auto 0;font-family:Georgia,serif;font-size:1.55rem;line-height:1.08}.cover small{opacity:.72}.cover-1{background:#533264}.cover-2{background:#713b2d}.cover-3{background:#264c72}.cover-4{background:#635021}.how{margin:70px 0;padding:28px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.how h2{margin:0 0 8px}.how p{margin:0;color:var(--muted);line-height:1.65}.how code{display:block;margin-top:16px;padding:15px;border-radius:10px;background:#07101e;color:#dce9fb;overflow:auto}.footer{padding:25px 0 45px;border-top:1px solid rgba(255,255,255,.08);color:var(--muted);font-size:.78rem}@media(max-width:760px){.shell{width:min(100% - 28px,1220px)}.hero{padding:52px 0 38px}.grid{grid-template-columns:1fr}.question-card{display:block}.question-visual{width:100%;min-width:0;padding:30px}.book-card{min-height:230px}.cover{width:135px;min-width:135px;padding:16px}.cover strong{font-size:1.15rem}.card-copy{padding:22px}.count{display:none}}
</style></head><body><div class="shell"><header class="top"><div class="brand"><span class="mark">IQ</span><span><strong>Interview Library</strong><small>QUESTIONS · BOOKS · STUDY</small></span></div><span class="count">${questionCount.toLocaleString()} questions · ${books.length} book${books.length === 1 ? "" : "s"}</span></header><main><section class="hero"><span class="eyebrow">Your learning shelf</span><h1>Prepare deeply.<br>Read widely.</h1><p>Your interview question bank and Markdown books now live together. Open the question collection for focused practice, or choose a book for chapter-by-chapter reading.</p></section><section><div class="section-head"><h2>Interview preparation</h2><span>Searchable and organized by technology</span></div><a class="card question-card" href="questions.html"><span class="question-visual"><span><strong>${questionCount.toLocaleString()}</strong><small>QUESTIONS</small></span></span><span class="card-copy"><span class="label">Interview question bank</span><strong>Practice by technology and topic</strong><span>Search, filter, copy, and review questions across .NET, cloud, architecture, frontend, testing, DevOps, and more.</span><em>Open question bank →</em></span></a></section><section><div class="section-head"><h2>Book shelf</h2></div><div class="grid">${cards || '<div class="card-copy">No books are currently available.</div>'}</div></section></main><footer class="footer">Built locally from your Markdown files. No server or internet connection required.</footer></div></body></html>`;
}

execFileSync(process.execPath, [resolve(root, "prepare-aws-book.mjs")], { cwd: root, stdio: "pipe" });
const preparedReader = readFileSync(resolve(root, "index.html"), "utf8");
const preparedAwsSections = parseEmbeddedSections(preparedReader);
rmSync(output, { recursive: true, force: true });
rmSync(resolve(root, "readers"), { recursive: true, force: true });
mkdirSync(resolve(output, "readers"), { recursive: true });
mkdirSync(resolve(root, "readers"), { recursive: true });

const csharpInDepthDirectory = resolve(booksDirectory, "csharp_in_depth_md");
const bookSources = uniqueBookFiles(booksDirectory)
  .filter((filePath) => relative(csharpInDepthDirectory, filePath).startsWith(".."))
  .map((filePath) => ({ filePath, markdown: readFileSync(filePath, "utf8") }));
const csharpInDepthBook = csharpInDepthSource(csharpInDepthDirectory);
if (csharpInDepthBook) bookSources.push(csharpInDepthBook);

const books = bookSources.map(({ filePath, markdown, imageSource: customImageSource }, index) => {
  const meta = metadataFromMarkdown(markdown, filePath);
  const isAwsBook = relative(booksDirectory, filePath) === "CompleteBook.md";
  const isAdaptiveCodeBook = relative(booksDirectory, filePath) === "Adaptive-Code-via-CSharp.md";
  const isReactBook = /Source:\s*React in Action\.pdf/i.test(markdown);
  const isExtractedBook = (markdown.match(/^C H A P T E R\s+[0-9 ]+\s*$/gm) || []).length >= 2;
  const prepared = isAwsBook
    ? { meta: { ...meta, author: "Michael Wittig & Andreas Wittig", description: "A practical, chapter-based guide to building and operating systems on AWS." }, sections: preparedAwsSections }
    : isReactBook ? reactBookSections(markdown, filePath)
      : isExtractedBook ? extractedBookSections(markdown, filePath) : genericSections(markdown, filePath);
  const sourceName = basename(filePath, extname(filePath)).toLowerCase() === "book"
    ? basename(dirname(filePath))
    : basename(filePath, extname(filePath));
  const readerDirectory = `${String(index + 1).padStart(2, "0")}-${slugify(sourceName)}`;
  const fileName = `${readerDirectory}/index.html`;
  const reader = replaceReaderData(preparedReader, prepared.sections, prepared.meta);
  mkdirSync(resolve(root, "readers", readerDirectory), { recursive: true });
  mkdirSync(resolve(output, "readers", readerDirectory), { recursive: true });
  writeFileSync(resolve(root, "readers", fileName), reader);
  writeFileSync(resolve(output, "readers", fileName), reader);
  const imageSource = customImageSource || (isAwsBook
    ? resolve(booksDirectory, "AWS Images", "images")
    : isAdaptiveCodeBook ? resolve(booksDirectory, "ac images") : resolve(dirname(filePath), "images"));
  if (existsSync(imageSource)) {
    cpSync(imageSource, resolve(root, "readers", readerDirectory, "images"), { recursive: true });
    cpSync(imageSource, resolve(output, "readers", readerDirectory, "images"), { recursive: true });
  }
  return { fileName, meta: prepared.meta, sectionCount: prepared.sections.length };
});

const questionsMarkdown = readFileSync(resolve(root, "UNIQUE_INTERVIEW_QUESTIONS_BY_TECHNOLOGY.md"), "utf8");
const questionCount = Number(questionsMarkdown.match(/Current unique question count:\s*(\d[\d,]*)/)?.[1]?.replaceAll(",", "")) || 0;
const questionsHtml = questionPage();
const libraryHtml = libraryPage(books, questionCount).replace(
  "Your interview question bank and Markdown books now live together. Open the question collection for focused practice, or choose a book for chapter-by-chapter reading.",
  "Explore the interview question collection for focused practice, or settle into a book and read it chapter by chapter."
).replace('<footer class="footer">Built locally from your Markdown files. No server or internet connection required.</footer>', "");
writeFileSync(resolve(root, "questions.html"), questionsHtml);
writeFileSync(resolve(output, "questions.html"), questionsHtml);
writeFileSync(resolve(root, "index.html"), libraryHtml);
writeFileSync(resolve(output, "index.html"), libraryHtml);
console.log(`Library built: ${questionCount.toLocaleString()} questions and ${books.length} book${books.length === 1 ? "" : "s"}.`);
for (const book of books) console.log(`  readers/${book.fileName} — ${book.meta.title} (${book.sectionCount} sections)`);
