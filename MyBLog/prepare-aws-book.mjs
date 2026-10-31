import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const markdown = fs.readFileSync(path.join(root, 'Books', 'CompleteBook.md'), 'utf8');

const chapterDefinitions = [
  ['part-1', 'Part 1 · Getting started', 'What is Amazon Web Services?'],
  ['part-1', 'Part 1 · Getting started', 'A simple example: WordPress in five minutes'],
  ['part-2', 'Part 2 · Virtual infrastructure', 'Using virtual machines: EC2'],
  ['part-2', 'Part 2 · Virtual infrastructure', 'Programming your infrastructure: The command-line, SDKs, and CloudFormation'],
  ['part-2', 'Part 2 · Virtual infrastructure', 'Automating deployment: CloudFormation, Elastic Beanstalk, and OpsWorks'],
  ['part-2', 'Part 2 · Virtual infrastructure', 'Securing your system: IAM, security groups, and VPC'],
  ['part-2', 'Part 2 · Virtual infrastructure', 'Automating operational tasks with Lambda'],
  ['part-3', 'Part 3 · Storing data in the cloud', 'Storing your objects: S3 and Glacier'],
  ['part-3', 'Part 3 · Storing data in the cloud', 'Storing data on hard drives: EBS and instance store'],
  ['part-3', 'Part 3 · Storing data in the cloud', 'Sharing data volumes between machines: EFS'],
  ['part-3', 'Part 3 · Storing data in the cloud', 'Using a relational database service: RDS'],
  ['part-3', 'Part 3 · Storing data in the cloud', 'Caching data in memory: Amazon ElastiCache'],
  ['part-3', 'Part 3 · Storing data in the cloud', 'Programming for the NoSQL database service: DynamoDB'],
  ['part-4', 'Part 4 · Architecting on AWS', 'Achieving high availability: availability zones, auto-scaling, and CloudWatch'],
  ['part-4', 'Part 4 · Architecting on AWS', 'Decoupling your infrastructure: Elastic Load Balancing and Simple Queue Service'],
  ['part-4', 'Part 4 · Architecting on AWS', 'Designing for fault tolerance'],
  ['part-4', 'Part 4 · Architecting on AWS', 'Scaling up and down: auto-scaling and CloudWatch'],
];

const startPatterns = [
  '## What is Amazon Web Services?', '## A simple example: WordPress in five minutes',
  '## Using virtual machines: EC2', '## Programming your infrastructure: The command-line, SDKs,',
  '## Automating deployment: CloudFormation, Elastic Beanstalk, and OpsWorks',
  '## Securing your system: IAM, security groups,', '## Automating operational',
  '## Storing your objects:', '## Storing data on hard drives:',
  '## Sharing data volumes between machines: EFS', '## Using a relational database service: RDS',
  '## Caching data in memory:', '## Programming for the NoSQL database service:',
  '## Achieving high availability: availability zones,',
  '## Decoupling your infrastructure: Elastic Load Balancing and',
  '## Designing for fault tolerance', '## Scaling up and down: auto-scaling and'
];

const starts = startPatterns.map((pattern) => {
  const index = markdown.indexOf(pattern);
  if (index < 0) throw new Error(`Missing chapter heading: ${pattern}`);
  return index;
});
const indexStart = markdown.indexOf('\n## index\n');

const partDefinitions = [
  ['part-1-opening', 'part-1', 'Part 1 · Getting started', 'Getting started', '## Part 1'],
  ['part-2-opening', 'part-2', 'Part 2 · Virtual infrastructure', 'Building virtual infrastructure', '## Part 2'],
  ['part-3-opening', 'part-3', 'Part 3 · Storing data in the cloud', 'Storing data in the cloud', '## Part 3'],
  ['part-4-opening', 'part-4', 'Part 4 · Architecting on AWS', 'Architecting on AWS', '## Part 4'],
];
const partStarts = partDefinitions.map((definition) => {
  const index = markdown.indexOf(`\n${definition[4]}\n`);
  if (index < 0) throw new Error(`Missing part heading: ${definition[4]}`);
  return index + 1;
});

function cleanChapter(source, title) {
  let value = source
    .replace(/^##[^\n]*\n(?:\s*## (?:and |tasks |S3 |EBS |Amazon |DynamoDB |auto-scaling |Simple Queue Service)[^\n]*\n)?/i, '')
    .replace(/<a id="pdf-page-[^"]+"><\/a>/g, '')
    .replace(/<!-- PDF page \d+ -->/g, '')
    .trim();
  return `# ${title}\n\n${value}`;
}

const chapters = chapterDefinitions.map(([partId, part, title], i) => ({
  id: `chapter-${i + 1}`,
  number: i + 1,
  partId,
  part,
  title,
  start: starts[i],
  clean: (source) => cleanChapter(source, title)
}));

const parts = partDefinitions.map(([id, partId, part, title], i) => ({
  id, number: `P${i + 1}`, partId, part, title, start: partStarts[i],
  clean: (source) => `# ${title}\n\n${source.replace(/^## Part \d+\s*\n\s*##[^\n]+\s*/i, '').trim()}`
}));

const ordered = [...parts, ...chapters].sort((a, b) => a.start - b.start);
const readingSections = ordered.map((section, i) => ({
  id: section.id,
  number: section.number,
  partId: section.partId,
  part: section.part,
  title: section.title,
  markdown: section.clean(markdown.slice(section.start, i === ordered.length - 1 ? indexStart : ordered[i + 1].start))
}));

const frontMatter = {
  id: 'front-matter', number: 0, partId: 'opening', part: 'Book opening', title: 'Welcome to the book',
  markdown: markdown.slice(0, partStarts[0]).replace(/<a id="pdf-page-[^"]+"><\/a>/g, '').replace(/<!-- PDF page \d+ -->/g, '').trim()
};
const bookIndex = {
  id: 'book-index', number: 'A–Z', partId: 'reference', part: 'Reference', title: 'Book index',
  markdown: markdown.slice(indexStart).replace(/^\s*## index\s*/i, '# Book index\n').trim()
};
const sections = [frontMatter, ...readingSections, bookIndex];
const payload = JSON.stringify(sections).replace(/</g, '\\u003c');

const html = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Read Amazon Web Services in Action, Second Edition in a chapter-based book reader.">
  <meta name="theme-color" content="#153d39">
  <title>AWS in Action · Book Reader</title>
  <style>
    :root{--paper:#f7f1e6;--paper-2:#fffdf8;--ink:#292a28;--muted:#6f706a;--line:#d8d0c2;--brand:#153d39;--brand-2:#235c55;--gold:#cc9a45;--code:#202a2c;--shadow:0 18px 60px rgba(44,37,25,.13);--reading:760px;--reader-size:18px;color-scheme:light}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-width:320px;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}button,input{font:inherit}button{color:inherit}a{color:var(--brand-2)}
    body.dark{--paper:#111918;--paper-2:#182321;--ink:#e9e4d8;--muted:#aaa99f;--line:#36423e;--brand:#81b8aa;--brand-2:#9acabe;--gold:#d6a954;--code:#0b100f;--shadow:0 18px 60px rgba(0,0,0,.3);color-scheme:dark}
    .topbar{position:fixed;z-index:30;inset:0 0 auto 0;height:72px;display:flex;align-items:center;gap:18px;padding:0 24px;background:var(--brand);color:#fff;box-shadow:0 3px 16px rgba(0,0,0,.13)}.brand{display:flex;align-items:center;gap:12px;min-width:270px}.brand-mark{display:grid;place-items:center;width:40px;height:44px;border-radius:4px 9px 9px 4px;background:var(--gold);color:#173632;font-family:Georgia,serif;font-weight:900;font-size:1.25rem;box-shadow:-4px 0 0 rgba(255,255,255,.22)}.brand strong,.brand small{display:block}.brand strong{font-family:Georgia,serif;font-size:1.03rem}.brand small{opacity:.68;font-size:.71rem;letter-spacing:.04em}.top-search{position:relative;width:min(560px,100%);margin:auto}.top-search input{width:100%;height:42px;padding:0 45px 0 42px;border:1px solid rgba(255,255,255,.18);border-radius:999px;outline:0;background:rgba(255,255,255,.11);color:#fff}.top-search input::placeholder{color:rgba(255,255,255,.67)}.top-search input:focus{background:rgba(255,255,255,.18);box-shadow:0 0 0 3px rgba(255,255,255,.1)}.search-icon{position:absolute;left:15px;top:11px;opacity:.7}.clear-search{position:absolute;right:8px;top:6px;width:30px;height:30px;border:0;background:none;color:#fff;cursor:pointer;display:none}.tools{display:flex;gap:7px}.tool,.menu-button{height:38px;min-width:38px;padding:0 10px;border:1px solid rgba(255,255,255,.22);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}.tool:hover,.menu-button:hover{background:rgba(255,255,255,.18)}.menu-button{display:none}
    .progress-track{position:fixed;z-index:40;top:72px;left:0;width:100%;height:3px;background:transparent}.progress-bar{height:100%;width:0;background:var(--gold)}
    .layout{display:grid;grid-template-columns:320px minmax(0,1fr);min-height:100vh;padding-top:72px;transition:grid-template-columns .22s}.layout.sidebar-hidden{grid-template-columns:minmax(0,1fr)}.sidebar{position:fixed;z-index:20;top:72px;bottom:0;left:0;width:320px;padding:30px 20px 60px;background:var(--paper-2);border-right:1px solid var(--line);overflow:auto}.layout.sidebar-hidden .sidebar{display:none}.side-kicker{margin:0;color:var(--gold);font-size:.7rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.side-title{margin:7px 0 4px;font-family:Georgia,serif;font-size:1.35rem;line-height:1.15}.side-meta{margin:0 0 25px;color:var(--muted);font-size:.78rem}.part-title{margin:24px 8px 8px;color:var(--muted);font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.chapter-link{display:grid;grid-template-columns:29px 1fr;gap:8px;width:100%;padding:9px 8px;border:0;border-radius:9px;background:none;color:var(--muted);text-align:left;cursor:pointer}.chapter-link:hover{background:color-mix(in srgb,var(--brand) 7%,transparent);color:var(--ink)}.chapter-link.active{background:var(--brand);color:#fff}.chapter-number{display:grid;place-items:center;width:25px;height:25px;border:1px solid currentColor;border-radius:50%;font-family:Georgia,serif;font-size:.72rem;opacity:.7}.chapter-name{align-self:center;font-size:.78rem;font-weight:650;line-height:1.25}.main{grid-column:2;min-width:0;padding:48px clamp(24px,6vw,100px) 100px}.layout.sidebar-hidden .main{grid-column:1}.reader-shell{max-width:var(--reading);margin:auto}.chapter-top{margin-bottom:40px;padding-bottom:25px;border-bottom:1px solid var(--line)}.part-label{margin:0 0 8px;color:var(--gold);font-size:.72rem;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.chapter-top h1{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.2rem,5vw,4.25rem);font-weight:600;line-height:1.02;letter-spacing:-.035em}.reading-time{margin:14px 0 0;color:var(--muted);font-size:.8rem}
    .book-content{font-family:Georgia,"Times New Roman",serif;font-size:var(--reader-size);line-height:1.82}.book-content>h1:first-child{display:none}.book-content h1,.book-content h2,.book-content h3{scroll-margin-top:100px;line-height:1.17}.book-content h2{margin:2.5em 0 .7em;font-size:1.72em}.book-content h3{margin:2em 0 .6em;font-size:1.28em}.book-content p{margin:0 0 1.22em}.book-content p:first-of-type::first-letter{float:left;margin:.08em .1em 0 0;color:var(--brand-2);font-size:3.3em;font-weight:700;line-height:.72}.book-content ul,.book-content ol{margin:0 0 1.4em;padding-left:1.45em}.book-content li{margin:.4em 0}.book-content blockquote{margin:1.8em 0;padding:1px 0 1px 22px;border-left:4px solid var(--gold);color:var(--muted);font-style:italic}.book-content code{padding:.12em .32em;border-radius:4px;background:color-mix(in srgb,var(--brand) 10%,transparent);font-family:"SFMono-Regular",Consolas,monospace;font-size:.82em}.book-content pre{margin:1.6em 0;padding:20px;border-radius:12px;background:var(--code);color:#e8efe9;box-shadow:var(--shadow);overflow:auto;line-height:1.55}.book-content pre code{padding:0;background:none;color:inherit;font-size:.76em}.book-content hr{margin:3em 0;border:0;border-top:1px solid var(--line)}.book-figure{margin:2.2em max(-30px,-4vw);padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--paper-2);box-shadow:var(--shadow)}.book-figure a{display:block}.book-figure img{display:block;width:100%;height:auto;max-height:82vh;border-radius:8px;object-fit:contain;background:#fff}.book-figure figcaption{padding:10px 5px 1px;color:var(--muted);font-family:Inter,sans-serif;font-size:.68em;line-height:1.45;text-align:center}.book-figure.image-error img{display:none}.book-figure.image-error::before{content:'Image unavailable';display:block;padding:35px;color:var(--muted);font-family:Inter,sans-serif;text-align:center}.callout{margin:1.7em 0;padding:15px 18px;border:1px solid color-mix(in srgb,var(--gold) 55%,var(--line));border-left:5px solid var(--gold);border-radius:8px;background:color-mix(in srgb,var(--gold) 7%,var(--paper-2));font-family:Inter,sans-serif;font-size:.82em;line-height:1.65}.callout strong{display:block;margin-bottom:3px;color:var(--ink);letter-spacing:.05em}.section-lead{margin:2.4em 0 .75em!important;padding-bottom:.4em;border-bottom:1px solid var(--line)}
    .code-shell{max-width:100%;margin:1.6em 0;border:1px solid #344447;border-radius:12px;background:var(--code);box-shadow:var(--shadow);overflow:hidden}.code-bar{display:flex;align-items:center;justify-content:space-between;min-height:38px;padding:0 9px 0 15px;border-bottom:1px solid rgba(255,255,255,.1);color:#a9bbb7;font:700 .66em Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase}.copy-code{padding:6px 9px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:rgba(255,255,255,.06);color:#dbe7e3;font:inherit;letter-spacing:0;cursor:pointer;text-transform:none}.copy-code:hover{background:rgba(255,255,255,.13)}.code-shell pre{max-width:100%;margin:0;padding:18px 20px;border-radius:0;box-shadow:none;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin}.code-shell pre code{display:block;min-width:max-content;tab-size:2}.book-figure{max-width:calc(100vw - 36px)}.book-figure img{max-width:100%;content-visibility:auto;contain-intrinsic-size:760px 980px}
    .chapter-footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:15px;margin-top:70px;padding-top:25px;border-top:1px solid var(--line)}.nav-chapter{padding:11px 14px;border:1px solid var(--line);border-radius:9px;background:var(--paper-2);cursor:pointer}.nav-chapter:hover{border-color:var(--brand-2)}.nav-chapter:last-child{justify-self:end}.nav-chapter:disabled{opacity:.35;cursor:not-allowed}.section-count{color:var(--muted);font-size:.75rem}
    .search-panel{display:none;max-width:900px;margin:auto}.search-panel.visible{display:block}.reader-shell.hidden{display:none}.search-panel h1{margin:0 0 5px;font-family:Georgia,serif;font-size:2.6rem}.search-summary{margin:0 0 26px;color:var(--muted)}.result{display:block;width:100%;margin:0 0 12px;padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--paper-2);text-align:left;cursor:pointer}.result:hover{border-color:var(--brand-2);transform:translateY(-1px)}.result small{color:var(--gold);font-weight:800;text-transform:uppercase}.result strong{display:block;margin:4px 0 8px;font-family:Georgia,serif;font-size:1.2rem}.result span{display:block;color:var(--muted);font-size:.85rem;line-height:1.55}.result mark{background:#f2d68b;color:#30260f}.empty{padding:50px 20px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);text-align:center}.scrim{display:none}
    @media(max-width:900px){.topbar{padding:0 12px;gap:10px}.brand{min-width:0}.brand-copy{display:none}.tools .font-tool{display:none}.menu-button{display:block}.layout,.layout.sidebar-hidden{display:block}.layout.sidebar-hidden .main,.main{padding:42px 20px 80px}.sidebar{top:72px;transform:translateX(-105%);transition:transform .22s}.sidebar.open{display:block;transform:none}.scrim{position:fixed;z-index:15;inset:72px 0 0;display:block;background:rgba(0,0,0,.38);opacity:0;pointer-events:none;transition:opacity .22s}.scrim.visible{opacity:1;pointer-events:auto}.chapter-top h1{font-size:clamp(2.2rem,10vw,3.5rem)}}
    @media(max-width:540px){.topbar{height:64px}.progress-track{top:64px}.layout{padding-top:64px}.sidebar{top:64px;width:min(88vw,320px)}.scrim{inset:64px 0 0}.tools{display:none}.chapter-footer{grid-template-columns:1fr 1fr}.section-count{display:none}.book-content{font-size:calc(var(--reader-size) - 1px);line-height:1.72}}
    @media(max-width:600px){.book-figure{max-width:100%;margin:1.5em 0;padding:6px;border-radius:10px}.book-figure img{max-height:none;border-radius:6px}.book-figure figcaption{padding:8px 4px 2px;font-size:.62em}.code-shell{margin:1.25em 0;border-radius:9px}.code-shell pre{padding:15px 14px}.code-shell pre code{min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;font-size:.72em}.code-bar{min-height:36px;padding-left:12px}}
    @media print{.topbar,.sidebar,.chapter-footer,.progress-track{display:none}.layout{display:block;padding:0}.main{padding:0}.book-content{font-size:11pt}.chapter-top h1{font-size:32pt}body{background:#fff;color:#000}}
    .menu-button{display:block}.book-content p{ text-align:justify;text-justify:inter-word;hyphens:auto;overflow-wrap:normal;word-break:normal}.book-content ul,.book-content ol{text-align:justify;text-justify:inter-word}
  </style>
</head>
<body>
  <header class="topbar">
    <button class="menu-button" id="menuButton" type="button" title="Hide chapter menu" aria-label="Hide chapter menu" aria-controls="sidebar" aria-expanded="true">☰</button>
    <div class="brand"><span class="brand-mark">AWS</span><span class="brand-copy"><strong>AWS in Action</strong><small>SECOND EDITION · READER</small></span></div>
    <label class="top-search"><span class="search-icon">⌕</span><input id="search" type="search" placeholder="Search the complete book…" autocomplete="off"><button class="clear-search" id="clearSearch" aria-label="Clear search">×</button></label>
    <div class="tools"><button class="tool font-tool" id="fontDown" title="Smaller text">A−</button><button class="tool font-tool" id="fontUp" title="Larger text">A+</button><button class="tool" id="theme" title="Toggle reading theme">◐</button></div>
  </header>
  <div class="progress-track"><div class="progress-bar" id="progress"></div></div>
  <div class="scrim" id="scrim"></div>
  <div class="layout">
    <aside class="sidebar" id="sidebar"><p class="side-kicker">Your digital copy</p><h2 class="side-title">Amazon Web Services<br>in Action</h2><p class="side-meta">Michael Wittig & Andreas Wittig · 17 chapters</p><nav id="chapters"></nav></aside>
    <main class="main">
      <section class="reader-shell" id="reader"><header class="chapter-top"><p class="part-label" id="partLabel"></p><h1 id="chapterTitle"></h1><p class="reading-time" id="readingTime"></p></header><article class="book-content" id="content"></article><footer class="chapter-footer"><button class="nav-chapter" id="previous">← Previous</button><span class="section-count" id="sectionCount"></span><button class="nav-chapter" id="next">Next →</button></footer></section>
      <section class="search-panel" id="searchPanel"><h1>Search the book</h1><p class="search-summary" id="searchSummary"></p><div id="results"></div></section>
    </main>
  </div>
  <script>
    const sections=${payload};
    function joinWrappedListItems(markdown){const lines=markdown.replace(/\r/g,'').split('\n'),result=[];let activeItem=-1;for(const line of lines){const text=line.trim();if(/^(?:[-*]|[■▪●])\s+/.test(text)){result.push(text);activeItem=result.length-1;continue}if(activeItem>=0&&/^<!-- Page\s+\d+ -->$/.test(text)){result.push(line);continue}if(activeItem>=0&&text&&!/^(?:#{1,6}\s|!\[|\`\`\`|>|(?:[-*]|[■▪●])\s+)/.test(text)){result[activeItem]+=' '+text;continue}result.push(line);if(!text||/^(?:#{1,6}\s|!\[|\`\`\`|>|(?:[-*]|[■▪●])\s+)/.test(text))activeItem=-1}return result.join('\n')}
    for(const section of sections)section.markdown=joinWrappedListItems(section.markdown);
    const el={nav:document.querySelector('#chapters'),layout:document.querySelector('.layout'),sidebar:document.querySelector('#sidebar'),menuButton:document.querySelector('#menuButton'),scrim:document.querySelector('#scrim'),reader:document.querySelector('#reader'),content:document.querySelector('#content'),part:document.querySelector('#partLabel'),title:document.querySelector('#chapterTitle'),time:document.querySelector('#readingTime'),count:document.querySelector('#sectionCount'),previous:document.querySelector('#previous'),next:document.querySelector('#next'),search:document.querySelector('#search'),clear:document.querySelector('#clearSearch'),searchPanel:document.querySelector('#searchPanel'),summary:document.querySelector('#searchSummary'),results:document.querySelector('#results'),progress:document.querySelector('#progress')};
    let current=Math.max(0,sections.findIndex(s=>s.id===(location.hash.slice(1)||localStorage.getItem('aws-reader-section'))));let fontSize=Number(localStorage.getItem('aws-reader-font'))||18;
    const escapeHtml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function inline(value){let s=escapeHtml(value).replace(/\\\*/g,'@@LITERAL_STAR@@').replace(/\\_/g,'@@LITERAL_UNDERSCORE@@');s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noreferrer">$1</a>');s=s.replace(/\`([^\`]+)\`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');return s.replace(/@@LITERAL_STAR@@/g,'*').replace(/@@LITERAL_UNDERSCORE@@/g,'_')}
    function imageFigure(alt,source){const src=source.trim().replace(/\\/g,'/');if(!/^(?:images\/|\.\.?\/|https?:\/\/)/i.test(src))return '<div class="callout"><strong>IMAGE</strong>'+escapeHtml(alt)+'</div>';return '<figure class="book-figure"><a href="'+escapeHtml(src)+'" target="_blank"><img src="'+escapeHtml(src)+'" alt="'+escapeHtml(alt)+'" loading="lazy" decoding="async" onerror="this.closest(\'figure\').classList.add(\'image-error\')"></a><figcaption>'+escapeHtml(alt)+'</figcaption></figure>'}
    function indentBraceCode(value){const lines=value.replace(/\r/g,'').split('\n');const content=lines.filter(line=>line.trim());if(!content.length||content.some(line=>/^\s/.test(line))||!content.some(line=>/[{}]/.test(line)))return value;let depth=0;return lines.map(line=>{const text=line.trim();if(!text)return '';const closing=(text.match(/^}+/)||[''])[0].length;depth=Math.max(0,depth-closing);const formatted='    '.repeat(depth)+text;const safe=text.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,'').replace(/\/\/.*$/,'');const opens=(safe.match(/{/g)||[]).length;const closes=(safe.match(/}/g)||[]).length;depth=Math.max(0,depth+opens-closes+closing);return formatted}).join('\n')}
    function joinWrappedCode(value){const lines=value.replace(/\r/g,'').split('\n'),result=[];let inString=false;for(const line of lines){const previous=result.at(-1)||'';const joinsMember=/\.\s*$/.test(previous);if(result.length&&(inString||joinsMember))result[result.length-1]=previous.trimEnd()+(joinsMember?'':' ')+line.trimStart();else result.push(line);if(!line.trimStart().startsWith('//')){const quotes=(line.match(/(^|[^\\])"/g)||[]).length;if(quotes%2)inString=!inString}}return result.join('\n')}
    function codeBlock(value,language=''){const raw=language.trim().toLowerCase();const alias={cs:'csharp','c#':'csharp','dotnet':'csharp',js:'javascript',ts:'typescript',sh:'shell',bash:'shell',yml:'yaml'}[raw]||raw;const safe=alias.replace(/[^a-z0-9.+#-]/g,'')||'code';const label=safe==='csharp'?'C#':safe==='code'?'Code':safe.charAt(0).toUpperCase()+safe.slice(1);return '<div class="code-shell"><div class="code-bar"><span>'+escapeHtml(label)+'</span><button class="copy-code" type="button" data-copy-code>Copy</button></div><pre><code class="language-'+escapeHtml(safe)+'">'+escapeHtml(indentBraceCode(joinWrappedCode(value)))+'</code></pre></div>'}
    function markdownToHtml(markdown){const lines=markdown.replace(/\r/g,'').split('\n');let out=[],paragraph=[],list=null,inCode=false,code=[],codeLanguage='',seenH1=false;const flushParagraph=()=>{if(paragraph.length){const text=paragraph.join(' ').trim();if(text)out.push('<p>'+inline(text)+'</p>');paragraph=[]}};const closeList=()=>{if(list){out.push('</'+list+'>');list=null}};for(const raw of lines){const line=raw.trimEnd();const fence=line.match(/^\`\`\`\s*(.*)$/);if(fence){flushParagraph();closeList();if(inCode){out.push(codeBlock(code.join('\n'),codeLanguage));code=[];codeLanguage=''}else{codeLanguage=fence[1].trim().split(/\s+/)[0]||''}inCode=!inCode;continue}if(inCode){code.push(raw);continue}if(/^\s*<a id=|^\s*<!--/.test(line))continue;if(!line.trim()){flushParagraph();closeList();continue}if(/^\s*(?:\d{1,3}|[ivxlcdm]{1,8})\s*$/i.test(line))continue;if(/^\*\*Original page \d+ — diagrams/.test(line)){flushParagraph();closeList();continue}const image=line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);if(image){flushParagraph();closeList();out.push(imageFigure(image[1],image[2]));continue}if(/^(?:Summary|This chapter covers)$/i.test(line.trim())){flushParagraph();closeList();out.push('<h2 class="section-lead">'+inline(line.trim())+'</h2>');continue}const callout=line.trim().match(/^(NOTE|WARNING|TIP)\s+(.+)/);if(callout){flushParagraph();closeList();out.push('<aside class="callout"><strong>'+callout[1]+'</strong>'+inline(callout[2])+'</aside>');continue}const heading=line.match(/^(#{1,4})\s+(.+)/);if(heading){flushParagraph();closeList();const level=heading[1].length;if(level===1&&seenH1){out.push(codeBlock(line,'shell'))}else{out.push('<h'+level+'>'+inline(heading[2])+'</h'+level+'>');if(level===1)seenH1=true}continue}if(/^---+$/.test(line.trim())){flushParagraph();closeList();out.push('<hr>');continue}if(/^>\s?/.test(line)){flushParagraph();closeList();out.push('<blockquote><p>'+inline(line.replace(/^>\s?/,''))+'</p></blockquote>');continue}const bullet=line.match(/^\s*(?:[-*]|[■▪●])\s*(.+)/);const ordered=line.match(/^\s*(\d+)[.)]?\s+(.+)/);if(bullet||ordered){flushParagraph();const type=ordered?'ol':'ul';if(list!==type){closeList();out.push('<'+type+'>');list=type}const items=bullet?(bullet[1].split(/\s*[■▪●]\s*/).filter(Boolean)): [ordered[2]];for(const item of items)out.push('<li'+(ordered?' value="'+ordered[1]+'"':'')+'>'+inline(item)+'</li>');continue}paragraph.push(line.trim())}flushParagraph();closeList();if(inCode)out.push(codeBlock(code.join('\n'),codeLanguage));return out.join('\n')}
    function nav(){let last='';el.nav.innerHTML=sections.map((s,i)=>{const group=s.part;if(group!==last){last=group;return '<p class="part-title">'+escapeHtml(group)+'</p>'+link(s,i)}return link(s,i)}).join('');el.nav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.index))))}
    function link(s,i){return '<button class="chapter-link" data-index="'+i+'"><span class="chapter-number">'+(s.number||'•')+'</span><span class="chapter-name">'+escapeHtml(s.title)+'</span></button>'}
    function show(index,anchorTop=true){current=Math.max(0,Math.min(sections.length-1,index));const s=sections[current];el.part.textContent=s.part;el.title.textContent=s.title;const words=s.markdown.trim().split(/\s+/).length;el.time.textContent=Math.max(1,Math.round(words/220))+' min read · '+words.toLocaleString()+' words';el.content.innerHTML=markdownToHtml(s.markdown);el.count.textContent=(current+1)+' of '+sections.length;el.previous.disabled=current===0;el.next.disabled=current===sections.length-1;document.querySelectorAll('.chapter-link').forEach((b,i)=>b.classList.toggle('active',i===current));localStorage.setItem('aws-reader-section',s.id);history.replaceState(null,'','#'+s.id);el.reader.classList.remove('hidden');el.searchPanel.classList.remove('visible');closeMenu();if(anchorTop)scrollTo({top:0,behavior:'smooth'})}
    function closeMenu(){el.sidebar.classList.remove('open');el.scrim.classList.remove('visible');if(matchMedia('(max-width: 900px)').matches){el.menuButton.setAttribute('aria-expanded','false');el.menuButton.title='Open chapter menu';el.menuButton.setAttribute('aria-label','Open chapter menu')}}
    addEventListener('resize',()=>{if(matchMedia('(max-width: 900px)').matches){el.layout.classList.remove('sidebar-hidden');closeMenu()}else{el.sidebar.classList.remove('open');el.scrim.classList.remove('visible');const hidden=localStorage.getItem('book-reader-sidebar-hidden')==='true';el.layout.classList.toggle('sidebar-hidden',hidden);el.menuButton.setAttribute('aria-expanded',String(!hidden));el.menuButton.title=hidden?'Show chapter menu':'Hide chapter menu';el.menuButton.setAttribute('aria-label',el.menuButton.title)}});
    function plain(markdown){return markdown.replace(/<[^>]+>|<!--.*?-->|[#*\`_>\[\]()]/g,' ').replace(/\s+/g,' ').trim()}
    function doSearch(){const query=el.search.value.trim();el.clear.style.display=query?'block':'none';if(query.length<2){el.searchPanel.classList.remove('visible');el.reader.classList.remove('hidden');return}const terms=query.toLowerCase().split(/\s+/);const matches=sections.map((s,i)=>({s,i,text:plain(s.markdown)})).filter(x=>terms.every(t=>(x.s.title+' '+x.text).toLowerCase().includes(t))).slice(0,50);el.reader.classList.add('hidden');el.searchPanel.classList.add('visible');el.summary.textContent=matches.length+' section'+(matches.length===1?'':'s')+' found for “'+query+'”';el.results.innerHTML=matches.length?matches.map(x=>{const lower=x.text.toLowerCase(),at=Math.max(0,lower.indexOf(terms[0])-90),snippet=x.text.slice(at,at+280);return '<button class="result" data-index="'+x.i+'"><small>'+escapeHtml(x.s.part)+'</small><strong>'+escapeHtml(x.s.title)+'</strong><span>…'+inline(snippet)+'…</span></button>'}).join(''):'<div class="empty">No matching passages. Try a shorter or broader phrase.</div>';el.results.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.search.value='';el.clear.style.display='none';show(Number(b.dataset.index))}));scrollTo({top:0,behavior:'smooth'})}
    el.content.addEventListener('click',async event=>{const button=event.target.closest('[data-copy-code]');if(!button)return;const value=button.closest('.code-shell').querySelector('code').textContent;try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value)}else{const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}button.textContent='Copied';setTimeout(()=>button.textContent='Copy',1400)}catch{button.textContent='Select & copy'}})
    el.previous.addEventListener('click',()=>show(current-1));el.next.addEventListener('click',()=>show(current+1));el.search.addEventListener('input',doSearch);el.clear.addEventListener('click',()=>{el.search.value='';doSearch();el.search.focus()});el.menuButton.addEventListener('click',()=>{if(matchMedia('(max-width: 900px)').matches){el.sidebar.classList.toggle('open');el.scrim.classList.toggle('visible');const expanded=el.sidebar.classList.contains('open');el.menuButton.setAttribute('aria-expanded',String(expanded));el.menuButton.title=expanded?'Close chapter menu':'Open chapter menu';el.menuButton.setAttribute('aria-label',el.menuButton.title)}else{const hidden=el.layout.classList.toggle('sidebar-hidden');el.menuButton.setAttribute('aria-expanded',String(!hidden));el.menuButton.title=hidden?'Show chapter menu':'Hide chapter menu';el.menuButton.setAttribute('aria-label',el.menuButton.title);localStorage.setItem('book-reader-sidebar-hidden',String(hidden))}});el.scrim.addEventListener('click',closeMenu);document.querySelector('#fontDown').addEventListener('click',()=>setFont(fontSize-1));document.querySelector('#fontUp').addEventListener('click',()=>setFont(fontSize+1));function setFont(size){fontSize=Math.max(15,Math.min(23,size));document.documentElement.style.setProperty('--reader-size',fontSize+'px');localStorage.setItem('aws-reader-font',fontSize)}document.querySelector('#theme').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('aws-reader-theme',document.body.classList.contains('dark')?'dark':'light')});addEventListener('scroll',()=>{const total=document.documentElement.scrollHeight-innerHeight;el.progress.style.width=(total>0?scrollY/total*100:0)+'%'});addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='f'){e.preventDefault();el.search.focus()}if(e.target.tagName!=='INPUT'&&e.key==='ArrowRight')show(current+1);if(e.target.tagName!=='INPUT'&&e.key==='ArrowLeft')show(current-1)});
    if(localStorage.getItem('aws-reader-theme')==='dark')document.body.classList.add('dark');if(matchMedia('(max-width: 900px)').matches){el.menuButton.setAttribute('aria-expanded','false');el.menuButton.title='Open chapter menu';el.menuButton.setAttribute('aria-label','Open chapter menu')}else if(localStorage.getItem('book-reader-sidebar-hidden')==='true'){el.layout.classList.add('sidebar-hidden');el.menuButton.setAttribute('aria-expanded','false');el.menuButton.title='Show chapter menu';el.menuButton.setAttribute('aria-label','Show chapter menu')}setFont(fontSize);nav();show(current,false);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'index.html'), html);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
console.log(`Built book reader with ${chapters.length} chapters (${Math.round(html.length / 1024)} KB).`);
