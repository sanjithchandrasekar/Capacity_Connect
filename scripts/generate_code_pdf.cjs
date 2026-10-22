const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

console.log('--- Capacity Connect Code-to-PDF Generator Initialized ---');

const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'scratch',
  '.gemini',
  '.system_generated'
]);

const IGNORE_FILES = new Set([
  'package-lock.json',
  'lint.log',
  'diff_branch.txt',
  'commit_diff.txt',
  'commit_diff_utf8.txt',
  'diff_full.txt',
  'db_dump.sql',
  '.env.local' // protect local environment secrets
]);

const ALLOWED_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs',
  '.css', '.html', '.sql', '.json', '.md'
]);

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Ultra-fast inline syntax highlighting
function highlightCode(rawCode, ext) {
  const lines = rawCode.split('\n');
  const padLength = Math.max(3, lines.length.toString().length);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const num = (i + 1).toString().padStart(padLength, ' ');
    let esc = escapeHtml(line);

    if (ext === '.sql') {
      if (/^\s*--/.test(line)) {
        esc = `<span class="c-cmt">${esc}</span>`;
      } else {
        esc = esc.replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|ALTER|DROP|FUNCTION|RETURNS|TRIGGER|POLICY|ROW|LEVEL|SECURITY|ENABLE|GRANT|TO|AS|BEGIN|END|DECLARE|RETURN|IF|THEN|ELSE|ELSIF|EXECUTE|LANGUAGE|PLPGSQL|SECURITY|DEFINER|SET|DEFAULT|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|UNIQUE|INDEX|ON|JOIN|LEFT|INNER|OUTER|GROUP|BY|ORDER|LIMIT|OFFSET|UNION|ALL|OR|AND|CASE|WHEN|THEN|END|VIEW|CASCADE)\b/gi, '<span class="c-kw">$1</span>');
      }
    } else if (ext === '.json') {
      esc = esc
        .replace(/(&quot;.*?&quot;)(?=:)/g, '<span class="c-prop">$1</span>')
        .replace(/(:\s*)(&quot;.*?&quot;)/g, '$1<span class="c-str">$2</span>')
        .replace(/\b(true|false|null)\b/g, '<span class="c-num">$1</span>')
        .replace(/\b(-?\d+(\.\d+)?)\b/g, '<span class="c-num">$1</span>');
    } else {
      // JS / TS / CSS
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) {
        esc = `<span class="c-cmt">${esc}</span>`;
      } else {
        esc = esc.replace(/\b(import|export|from|default|const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|new|class|interface|type|extends|implements|as|async|await|typeof|instanceof|void|yield)\b/g, '<span class="c-kw">$1</span>');
        esc = esc.replace(/\b(true|false|null|undefined)\b/g, '<span class="c-num">$1</span>');
        esc = esc.replace(/\b(string|number|boolean|any|unknown|never|void|Record|Array|Promise|React|FC|JSX|HTMLElement)\b/g, '<span class="c-typ">$1</span>');
      }
    }

    out.push(`<span class="ln">${num} | </span>${esc}`);
  }

  return out.join('\n');
}

function scanFiles() {
  const allFiles = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (ALLOWED_EXTS.has(ext) && !IGNORE_FILES.has(entry.name)) {
          const fullPath = path.join(currentDir, entry.name);
          const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
          const stat = fs.statSync(fullPath);
          allFiles.push({
            fullPath,
            relPath,
            name: entry.name,
            ext,
            size: stat.size
          });
        }
      }
    }
  }

  walk(ROOT_DIR);
  return allFiles;
}

function categorizeFile(file) {
  const p = file.relPath;
  if (p === 'package.json' || p === 'vite.config.ts' || p === 'tailwind.config.js' || p.startsWith('tsconfig') || p === 'postcss.config.js' || p === 'components.json' || p === 'vercel.json' || p === 'README.md' || p === 'index.html') {
    return { section: '01. Configuration & Build Setup', order: 1 };
  }
  if (p === 'src/main.tsx' || p === 'src/App.tsx' || p === 'src/index.css' || p === 'src/App.css') {
    return { section: '02. Application Entry & Core Setup', order: 2 };
  }
  if (p.startsWith('src/integrations/') || p.startsWith('src/lib/') || p.startsWith('src/utils/')) {
    return { section: '03. Integrations, Supabase Client & Utilities', order: 3 };
  }
  if (p.startsWith('src/hooks/')) {
    return { section: '04. Custom Hooks & State Management', order: 4 };
  }
  if (p.startsWith('src/pages/')) {
    return { section: '05. Application Pages & Views', order: 5 };
  }
  if (p.startsWith('src/features/trainer/')) {
    return { section: '06. Features — Trainer Management', order: 6 };
  }
  if (p.startsWith('src/features/courses/')) {
    return { section: '07. Features — Courses, Sessions & Learning', order: 7 };
  }
  if (p.startsWith('src/features/admin/')) {
    return { section: '08. Features — Super Admin & Governance', order: 8 };
  }
  if (p.startsWith('src/features/notifications/') || p.startsWith('src/features/certificates/')) {
    return { section: '09. Features — Notifications & Certificates', order: 9 };
  }
  if (p.startsWith('src/components/ui/')) {
    return { section: '10. UI Primitives & Design System (Radix/Tailwind)', order: 10 };
  }
  if (p.startsWith('src/components/')) {
    return { section: '11. Shared Layout & Dialog Components', order: 11 };
  }
  if (p.startsWith('supabase/functions/')) {
    return { section: '12. Supabase Backend — Edge Functions', order: 12 };
  }
  if (p.startsWith('supabase/migrations/')) {
    return { section: '13. Supabase Backend — Database Migrations', order: 13 };
  }
  if (p.startsWith('scripts/') || !p.includes('/')) {
    return { section: '14. System, Audit & Database Scripts', order: 14 };
  }
  return { section: '15. Miscellaneous Code', order: 15 };
}

console.log('Scanning files...');
const files = scanFiles();

let totalLines = 0;
let totalBytes = 0;

for (const file of files) {
  const cat = categorizeFile(file);
  file.section = cat.section;
  file.order = cat.order;
  const content = fs.readFileSync(file.fullPath, 'utf8');
  file.lines = content.split('\n').length;
  file.content = content;
  totalLines += file.lines;
  totalBytes += file.size;
}

files.sort((a, b) => {
  if (a.order !== b.order) return a.order - b.order;
  return a.relPath.localeCompare(b.relPath);
});

console.log(`Found ${files.length} source files, totaling ${totalLines.toLocaleString()} lines (${(totalBytes / 1024 / 1024).toFixed(2)} MB).`);

function buildHtml(fileSubset, title, subtitle) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 14mm 10mm 14mm 10mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }

  /* Cover Page */
  .cover-page {
    page-break-after: always;
    min-height: 88vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 24px;
    border: 2px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
  }
  .cover-header {
    border-bottom: 3px solid #2563eb;
    padding-bottom: 20px;
  }
  .cover-badge {
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 12px;
    border: 1px solid #bfdbfe;
  }
  .cover-title {
    font-size: 34px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 8px 0;
  }
  .cover-subtitle {
    font-size: 16px;
    color: #475569;
    margin: 0;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 20px 0;
  }
  .meta-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
  }
  .meta-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    font-weight: 700;
    margin-bottom: 3px;
  }
  .meta-value {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
  }

  .tech-stack {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .tech-pill {
    background: #f1f5f9;
    color: #334155;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
  }

  .cover-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
    font-size: 10px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
  }

  /* Table of Contents */
  .toc-page {
    page-break-after: always;
    padding-top: 6px;
  }
  .toc-title {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 6px;
    margin-bottom: 14px;
  }
  .toc-section {
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .toc-section-header {
    font-size: 11px;
    font-weight: 700;
    color: #1e40af;
    background: #eff6ff;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
    border-left: 3px solid #2563eb;
  }
  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .toc-item {
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    padding: 2px 6px;
    border-bottom: 1px dotted #e2e8f0;
    font-family: "JetBrains Mono", "Consolas", monospace;
  }
  .toc-item:nth-child(even) {
    background: #f8fafc;
  }
  .toc-item-meta {
    color: #64748b;
    white-space: nowrap;
    margin-left: 10px;
  }

  /* Code Section */
  .file-container {
    page-break-before: always;
    margin-bottom: 16px;
  }
  .file-header {
    page-break-inside: avoid;
    page-break-after: avoid;
    background: #0f172a;
    color: #f8fafc;
    padding: 6px 10px;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #2563eb;
  }
  .file-path {
    font-family: "JetBrains Mono", "Consolas", monospace;
    font-size: 10.5px;
    font-weight: 700;
    color: #ffffff;
  }
  .file-badges {
    display: flex;
    gap: 6px;
  }
  .file-badge {
    background: #1e293b;
    color: #93c5fd;
    font-size: 8.5px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #334155;
    font-family: sans-serif;
  }
  .file-badge-accent {
    background: #1e3a8a;
    color: #bfdbfe;
    border-color: #3b82f6;
  }

  .code-pre {
    margin: 0;
    padding: 6px 8px;
    background: #fafafa;
    border: 1px solid #e2e8f0;
    border-top: none;
    border-radius: 0 0 6px 6px;
    font-family: "Consolas", "Courier New", monospace;
    font-size: 7.2pt;
    line-height: 1.34;
    white-space: pre-wrap;
    word-break: break-all;
    tab-size: 2;
    color: #1e293b;
  }

  .ln {
    color: #94a3b8;
    user-select: none;
    display: inline-block;
  }

  /* Syntax Highlighting */
  .c-kw { color: #7c3aed; font-weight: 600; }
  .c-str { color: #059669; }
  .c-cmt { color: #64748b; font-style: italic; }
  .c-typ { color: #0284c7; font-weight: 600; }
  .c-num { color: #d97706; font-weight: 600; }
  .c-prop { color: #2563eb; }
</style>
</head>
<body>

<!-- Cover Page -->
<div class="cover-page">
  <div class="cover-header">
    <div class="cover-badge">Source Code Documentation</div>
    <h1 class="cover-title">Capacity Connect</h1>
    <p class="cover-subtitle">${escapeHtml(subtitle)}</p>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">Total Files Included</div>
      <div class="meta-value">${fileSubset.length.toLocaleString()} Files</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Total Code Lines</div>
      <div class="meta-value">${fileSubset.reduce((acc, f) => acc + f.lines, 0).toLocaleString()} Lines</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Export Date &amp; Time</div>
      <div class="meta-value">${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Technology Stack</div>
      <div class="meta-value">React 19, TypeScript, Supabase</div>
    </div>
  </div>

  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px;">
    <div class="meta-label">Architecture &amp; Core Dependencies</div>
    <div class="tech-stack">
      <span class="tech-pill">React 19</span>
      <span class="tech-pill">TypeScript</span>
      <span class="tech-pill">Vite</span>
      <span class="tech-pill">Tailwind CSS</span>
      <span class="tech-pill">Supabase Backend</span>
      <span class="tech-pill">PostgreSQL &amp; RLS Policies</span>
      <span class="tech-pill">Supabase Edge Functions (Deno)</span>
      <span class="tech-pill">Radix UI Primitives</span>
      <span class="tech-pill">TanStack React Query</span>
      <span class="tech-pill">React Hook Form + Zod</span>
      <span class="tech-pill">Three.js / React Three Fiber</span>
      <span class="tech-pill">TensorFlow.js (BlazeFace/COCO-SSD)</span>
    </div>
  </div>

  <div class="cover-footer">
    <span>Capacity Connect Application Repository</span>
    <span>Directory: E:\\Projects\\capacity connect</span>
  </div>
</div>

<!-- Table of Contents -->
<div class="toc-page">
  <div class="toc-title">Table of Contents</div>
`;

  const subSections = {};
  for (const f of fileSubset) {
    if (!subSections[f.section]) subSections[f.section] = [];
    subSections[f.section].push(f);
  }

  for (const [secTitle, secFiles] of Object.entries(subSections)) {
    const secLines = secFiles.reduce((acc, f) => acc + f.lines, 0);
    html += `
  <div class="toc-section">
    <div class="toc-section-header">${escapeHtml(secTitle)} (${secFiles.length} files, ${secLines.toLocaleString()} lines)</div>
    <ul class="toc-list">
    `;
    for (const f of secFiles) {
      html += `
      <li class="toc-item">
        <span>${escapeHtml(f.relPath)}</span>
        <span class="toc-item-meta">${f.lines.toLocaleString()} lines | ${(f.size / 1024).toFixed(1)} KB</span>
      </li>
      `;
    }
    html += `
    </ul>
  </div>
    `;
  }

  html += `
</div>

<!-- Source Code Content -->
`;

  for (const f of fileSubset) {
    html += `
<div class="file-container">
  <div class="file-header">
    <div class="file-path">${escapeHtml(f.relPath)}</div>
    <div class="file-badges">
      <span class="file-badge">${f.ext.toUpperCase().replace('.', '')}</span>
      <span class="file-badge">${(f.size / 1024).toFixed(1)} KB</span>
      <span class="file-badge file-badge-accent">${f.lines.toLocaleString()} Lines</span>
    </div>
  </div>
  <pre class="code-pre"><code>${highlightCode(f.content, f.ext)}</code></pre>
</div>
`;
  }

  html += `
</body>
</html>
`;
  return html;
}

function renderPdf(htmlPath, pdfPath) {
  const headerTemplate = `
    <div style="font-size: 8px; width: 100%; display: flex; justify-content: space-between; padding: 0 10mm; color: #64748b; font-family: sans-serif; border-bottom: 0.5px solid #e2e8f0; padding-bottom: 2px;">
      <span style="font-weight: 700; color: #1e293b;">CAPACITY CONNECT</span>
      <span>Source Code Documentation</span>
    </div>
  `;

  const footerTemplate = `
    <div style="font-size: 8px; width: 100%; display: flex; justify-content: space-between; padding: 0 10mm; color: #64748b; font-family: sans-serif; border-top: 0.5px solid #e2e8f0; padding-top: 2px;">
      <span>Capacity Connect Repository</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
  `;

  console.log(`Rendering PDF via browser (${path.basename(BROWSER_PATH)})...`);
  const t0 = Date.now();
  execFileSync(BROWSER_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--display-header-footer',
    `--header-template=${headerTemplate}`,
    `--footer-template=${footerTemplate}`,
    `--print-to-pdf=${pdfPath}`,
    htmlPath
  ], { maxBuffer: 1024 * 1024 * 100, timeout: 600000 });

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  const sizeMb = (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2);
  console.log(`Generated: ${path.basename(pdfPath)} (${sizeMb} MB in ${duration}s)`);
}

function main() {
  const outputDir = ROOT_DIR;

  // 1. Frontend & Core Application
  const frontendFiles = files.filter(f => !f.relPath.startsWith('supabase/'));
  // 2. Supabase Backend & Database
  const backendFiles = files.filter(f => f.relPath.startsWith('supabase/') || f.relPath.startsWith('scripts/'));

  console.log('\n--- 1. Generating Volume 1: Frontend Application PDF ---');
  const vol1HtmlPath = path.join(outputDir, 'Capacity_Connect_Frontend_Application.html');
  const vol1PdfPath = path.join(outputDir, 'Capacity_Connect_Frontend_Application.pdf');
  fs.writeFileSync(vol1HtmlPath, buildHtml(frontendFiles, 'Capacity Connect — Frontend Application', 'Frontend Application Architecture, Pages, Features & Components'));
  renderPdf(vol1HtmlPath, vol1PdfPath);
  fs.unlinkSync(vol1HtmlPath);

  console.log('\n--- 2. Generating Volume 2: Supabase Backend & Database PDF ---');
  const vol2HtmlPath = path.join(outputDir, 'Capacity_Connect_Backend_and_Database.html');
  const vol2PdfPath = path.join(outputDir, 'Capacity_Connect_Backend_and_Database.pdf');
  fs.writeFileSync(vol2HtmlPath, buildHtml(backendFiles, 'Capacity Connect — Backend & Database', 'Supabase Database Schema, Migrations, Edge Functions & Maintenance Scripts'));
  renderPdf(vol2HtmlPath, vol2PdfPath);
  fs.unlinkSync(vol2HtmlPath);

  console.log('\n--- 3. Generating Complete Codebase Master PDF ---');
  const masterHtmlPath = path.join(outputDir, 'Capacity_Connect_Source_Code_Complete.html');
  const masterPdfPath = path.join(outputDir, 'Capacity_Connect_Source_Code_Complete.pdf');
  fs.writeFileSync(masterHtmlPath, buildHtml(files, 'Capacity Connect — Complete Codebase', 'Complete Source Code Documentation (All 238 Files, 53,700+ Lines)'));
  renderPdf(masterHtmlPath, masterPdfPath);
  fs.unlinkSync(masterHtmlPath);

  console.log('\n======================================================');
  console.log('SUCCESS! All PDF documents generated:');
  console.log('1. Capacity_Connect_Frontend_Application.pdf');
  console.log('2. Capacity_Connect_Backend_and_Database.pdf');
  console.log('3. Capacity_Connect_Source_Code_Complete.pdf');
  console.log('======================================================\n');
}

main();
