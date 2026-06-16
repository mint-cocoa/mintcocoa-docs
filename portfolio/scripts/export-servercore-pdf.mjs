import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const configPath = process.env.PDF_EXPORT_CONFIG || path.join(repoRoot, "pdf-export.config.json");
const quartoBin = process.env.QUARTO_BIN || "quarto";
const chromiumPath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;

function loadConfig() {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    path.join(repoRoot, "node_modules", "playwright"),
    "/home/cocoa/.local/playwright-tools/node_modules/playwright",
    "playwright",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next location.
    }
  }

  throw new Error("Playwright module not found. Set PLAYWRIGHT_MODULE or install playwright.");
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else if (entry.isFile()) fs.copyFileSync(srcPath, destPath);
  }
}

function parseSvgSize(svgPath) {
  const text = fs.readFileSync(svgPath, "utf8");
  const svgTag = text.match(/<svg\b[^>]*>/i)?.[0] || "";
  const readNumber = (name) => {
    const match = svgTag.match(new RegExp(`\\b${name}=["']?([0-9.]+)`));
    return match ? Number(match[1]) : undefined;
  };
  const width = readNumber("width");
  const height = readNumber("height");
  if (width && height) return { width, height };

  const viewBox = svgTag.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  const parts = viewBox?.trim().split(/[\s,]+/).map(Number);
  if (parts?.length === 4 && parts[2] > 0 && parts[3] > 0) {
    return { width: parts[2], height: parts[3] };
  }

  return { width: 1200, height: 800 };
}

function findFiles(root, predicate, found = []) {
  if (!fs.existsSync(root)) return found;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) findFiles(entryPath, predicate, found);
    else if (entry.isFile() && predicate(entryPath)) found.push(entryPath);
  }
  return found;
}

async function rasterizeSvg(browser, svgPath, pngPath, rasterConfig = {}) {
  const scale = Number(rasterConfig.scale || 1);
  const { width, height } = parseSvgSize(svgPath);
  const viewport = {
    width: Math.max(1, Math.ceil(width * scale)),
    height: Math.max(1, Math.ceil(height * scale)),
  };
  const page = await browser.newPage({ viewport });
  try {
    const src = pathToFileURL(svgPath).href;
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:transparent"><img src="${src}" style="display:block;width:${viewport.width}px;height:${viewport.height}px"></body></html>`,
      { waitUntil: "load" },
    );
    const png = await page.screenshot({
      type: "png",
      omitBackground: true,
      clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    });
    fs.writeFileSync(pngPath, png);
  } finally {
    await page.close();
  }
}

async function rasterizeSvgs(browser, root, rasterConfig = {}) {
  if (rasterConfig.enabled === false) return;
  const outputExtension = rasterConfig.outputExtension || ".png";
  const svgs = findFiles(root, (file) => file.toLowerCase().endsWith(".svg"));
  for (const svgPath of svgs) {
    const pngPath = svgPath.replace(/\.svg$/i, outputExtension);
    await rasterizeSvg(browser, svgPath, pngPath, rasterConfig);
  }
}

function removeFrontMatter(text) {
  return text.replace(/^---\r?\n.*?\r?\n---\r?\n/s, "");
}

function rewriteSvgImagePath(target, rasterConfig = {}) {
  if (rasterConfig.enabled === false) return target;
  const outputExtension = rasterConfig.outputExtension || ".png";
  return target.replace(/\.svg$/i, outputExtension);
}

function markdownToPrintBody(text, rasterConfig = {}) {
  return removeFrontMatter(text)
    .replace(/^---\s*$/gm, "***")
    .replace(/!\[\[([^\]]+)\]\]/g, (_, rawTarget) => {
      const [rawPath, rawWidth] = rawTarget.split("|").map((part) => part.trim());
      const normalized = rawPath.replace(/\\/g, "/");
      const basename = path.basename(normalized, path.extname(normalized));
      const alt = basename.replace(/[-_]/g, " ");
      const suffix = rawWidth && /^\d+$/.test(rawWidth) ? `{width="${rawWidth}px"}` : "";
      return `![${alt}](${rewriteSvgImagePath(normalized, rasterConfig)})${suffix}`;
    })
    .replace(/^######\s+/gm, "#### ")
    .replace(/^#####\s+/gm, "### ")
    .replace(/^####\s+/gm, "## ")
    .replace(/^###\s+/gm, "# ")
    .replace(/^\*\*\*\s*$/gm, "")
    .trim();
}

function chapterOrder(file) {
  const match = file.match(/^(\d+)\./);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

async function buildPrintQmd(config, printDir, browser) {
  const servercore = config.servercore;
  const sourceDir = path.join(repoRoot, servercore.sourceDir);
  const excluded = new Set(servercore.exclude || []);
  const chapters = fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !excluded.has(file))
    .sort((a, b) => chapterOrder(a) - chapterOrder(b) || a.localeCompare(b, "ko"));

  const printQmd = path.join(printDir, `${servercore.name}.print.qmd`);
  const styles = config.styles.map((style) => path.basename(style));
  const cssYaml = ["css:", ...styles.map((style) => `  - ${style}`)].join("\n");
  const parts = [
    `---
title: "${servercore.title.replace(/"/g, '\\"')}"
subtitle: "${servercore.subtitle.replace(/"/g, '\\"')}"
author: "${servercore.author.replace(/"/g, '\\"')}"
lang: ko
theme: cosmo
toc: false
number-sections: true
number-depth: 2
${cssYaml}
embed-resources: true
---

${servercore.intro}`,
  ];

  for (const chapter of chapters) {
    parts.push(markdownToPrintBody(fs.readFileSync(path.join(sourceDir, chapter), "utf8"), config.svgRasterization));
  }

  fs.writeFileSync(printQmd, `${parts.join("\n\n")}\n`, "utf8");
  for (const style of config.styles) {
    fs.copyFileSync(path.join(repoRoot, style), path.join(printDir, path.basename(style)));
  }
  const diagramsPrintDir = path.join(printDir, "diagrams");
  copyDir(path.join(repoRoot, servercore.diagramsDir), diagramsPrintDir);
  await rasterizeSvgs(browser, diagramsPrintDir, config.svgRasterization);

  return printQmd;
}

function renderQuarto(printQmd, printDir) {
  const config = loadConfig();
  const cssArgs = config.styles.flatMap((style) => ["--metadata", `css=${path.basename(style)}`]);
  const result = spawnSync(
    quartoBin,
    ["render", printQmd, "--to", "html", ...cssArgs, "--number-sections"],
    {
      cwd: printDir,
      stdio: "inherit",
      env: {
        ...process.env,
        XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || "/tmp/mintcocoa-quarto-cache",
        DENO_DIR: process.env.DENO_DIR || "/tmp/mintcocoa-deno-cache",
      },
    },
  );

  if (result.status !== 0) {
    throw new Error(`quarto render failed with exit code ${result.status}`);
  }

  return path.join(printDir, `${config.servercore.name}.print.html`);
}

async function printPdf(page, htmlPath, outputPath, chromePdfOptions) {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
  await page.waitForTimeout(1200);
  const cdp = await page.context().newCDPSession(page);
  const pdf = await cdp.send("Page.printToPDF", chromePdfOptions);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(pdf.data, "base64"));
}

async function main() {
  const config = loadConfig();
  const printDir = path.join(repoRoot, "build", "servercore-print");
  fs.rmSync(printDir, { recursive: true, force: true });
  fs.mkdirSync(printDir, { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumPath,
    args: ["--no-sandbox"],
  });

  try {
    const printQmd = await buildPrintQmd(config, printDir, browser);
    const printHtml = renderQuarto(printQmd, printDir);
    const outputPdf = path.join(repoRoot, config.servercore.output);
    const page = await browser.newPage();
    await printPdf(page, printHtml, outputPdf, config.chromePdfOptions);
    await page.close();

    for (const copy of config.servercore.copies || []) {
      const dest = path.join(repoRoot, copy);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(outputPdf, dest);
    }

    console.log(`Print HTML written: ${printHtml}`);
    console.log(`PDF written: ${outputPdf}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
