import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const configPath = process.env.PDF_EXPORT_CONFIG || path.join(projectRoot, "tools", "pdf-export.config.json");
const quartoBin = process.env.QUARTO_BIN || "quarto";
const chromiumPath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;
const localFontPath = path.join(projectRoot, "tools", "fonts", "NotoSansKR-VF.ttf");

function loadConfig() {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    path.join(projectRoot, "node_modules", "playwright"),
    "/home/cocoa/.local/playwright-tools/node_modules/playwright",
    "playwright",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Playwright module not found. Set PLAYWRIGHT_MODULE or install playwright.");
}

function resolveProjectPath(relativePath) {
  return path.join(projectRoot, relativePath);
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

function findFiles(root, predicate, found = []) {
  if (!fs.existsSync(root)) return found;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) findFiles(entryPath, predicate, found);
    else if (entry.isFile() && predicate(entryPath)) found.push(entryPath);
  }
  return found;
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

async function rasterizeSvg(browser, svgPath, pngPath, rasterConfig = {}) {
  const scale = Number(rasterConfig.scale || 1);
  const { width, height } = parseSvgSize(svgPath);
  const svg = fs.readFileSync(svgPath, "utf8");
  const viewport = {
    width: Math.max(1, Math.ceil(width * scale)),
    height: Math.max(1, Math.ceil(height * scale)),
  };
  const page = await browser.newPage({ viewport });
  try {
    const fontFaceCss = fs.existsSync(localFontPath)
      ? `
@font-face{font-family:"Noto Sans KR";src:url("${pathToFileURL(localFontPath).href}") format("truetype");font-weight:100 900;font-style:normal}
@font-face{font-family:"Noto Sans CJK KR";src:url("${pathToFileURL(localFontPath).href}") format("truetype");font-weight:100 900;font-style:normal}
`
      : "";
    await page.setContent(
      `<!doctype html><html><head><style>${fontFaceCss}html,body{margin:0;padding:0;background:#fff}svg{display:block;width:${viewport.width}px !important;height:${viewport.height}px !important}</style></head><body>${svg}</body></html>`,
      { waitUntil: "load" },
    );
    await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
    const png = await page.screenshot({
      type: "png",
      omitBackground: false,
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
    await rasterizeSvg(browser, svgPath, svgPath.replace(/\.svg$/i, outputExtension), rasterConfig);
  }
}

function rewriteSvgPath(target, rasterConfig = {}) {
  if (rasterConfig.enabled === false) return target;
  return target.replace(/\.svg$/i, rasterConfig.outputExtension || ".png");
}

function rewriteSvgImageReferences(markdown, rasterConfig = {}) {
  if (rasterConfig.enabled === false) return markdown;
  const outputExtension = rasterConfig.outputExtension || ".png";
  return markdown
    .replace(/(\]\([^)\s]+)\.svg(\))/gi, `$1${outputExtension}$2`)
    .replace(/(<img\b[^>]*\bsrc=["'][^"']+)\.svg(["'][^>]*>)/gi, `$1${outputExtension}$2`);
}

function parseFrontMatter(source) {
  const text = fs.readFileSync(source, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const yaml = match ? match[1] : "";
  const body = match ? text.slice(match[0].length) : text;
  const read = (key) => {
    const keyMatch = yaml.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, "m"));
    return keyMatch ? keyMatch[1].trim() : "";
  };
  return {
    title: read("title"),
    subtitle: read("subtitle"),
    author: read("author") || "배진후",
    body,
  };
}

function removeFrontMatter(text) {
  return text.replace(/^---\r?\n.*?\r?\n---\r?\n/s, "");
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
      return `![${alt}](${rewriteSvgPath(normalized, rasterConfig)})${suffix}`;
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

function cssYaml(config) {
  return ["css:", ...config.styles.map((style) => `  - ${path.basename(style)}`)].join("\n");
}

function copyStyles(config, printDir) {
  for (const style of config.styles) {
    fs.copyFileSync(resolveProjectPath(style), path.join(printDir, path.basename(style)));
  }
  copyDir(path.join(projectRoot, "tools", "fonts"), path.join(printDir, "fonts"));
}

async function buildServerCoreQmd(config, printDir, browser) {
  const servercore = config.servercore;
  const sourceDir = resolveProjectPath(servercore.sourceDir);
  const chapters = fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith(".md"))
    .sort((a, b) => chapterOrder(a) - chapterOrder(b) || a.localeCompare(b, "ko"));

  const diagramsPrintDir = path.join(printDir, "diagrams");
  copyDir(resolveProjectPath(servercore.diagramsDir), diagramsPrintDir);
  await rasterizeSvgs(browser, diagramsPrintDir, config.svgRasterization);

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
${cssYaml(config)}
embed-resources: true
---

${servercore.intro}`,
  ];

  for (const chapter of chapters) {
    parts.push(markdownToPrintBody(fs.readFileSync(path.join(sourceDir, chapter), "utf8"), config.svgRasterization));
  }

  const printQmd = path.join(printDir, `${servercore.name}.print.qmd`);
  fs.writeFileSync(printQmd, `${parts.join("\n\n")}\n`, "utf8");
  copyStyles(config, printDir);
  return printQmd;
}

async function buildPageQmd(config, pageConfig, printDir, browser) {
  const source = resolveProjectPath(pageConfig.source);
  const metadata = parseFrontMatter(source);
  for (const resource of pageConfig.resources || []) {
    const resourcePrintDir = path.join(printDir, path.basename(resource));
    copyDir(resolveProjectPath(resource), resourcePrintDir);
    await rasterizeSvgs(browser, resourcePrintDir, config.svgRasterization);
  }

  const subtitle = metadata.subtitle ? `subtitle: "${metadata.subtitle.replace(/"/g, '\\"')}"\n` : "";
  const printQmd = path.join(printDir, `${pageConfig.name}.print.qmd`);
  const qmd = `---
title: "${metadata.title.replace(/"/g, '\\"')}"
${subtitle}author: "${metadata.author.replace(/"/g, '\\"')}"
lang: ko
theme: cosmo
toc: false
number-sections: true
number-depth: 2
${cssYaml(config)}
embed-resources: true
---

${rewriteSvgImageReferences(metadata.body, config.svgRasterization).replace(/^---\s*$/gm, "***")}
`;

  fs.writeFileSync(printQmd, qmd, "utf8");
  copyStyles(config, printDir);
  return printQmd;
}

function renderPrintHtml(config, printQmd, printDir) {
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

  return printQmd.replace(/\.qmd$/i, ".html");
}

async function rasterizeInlineSvgs(page) {
  const handles = await page.$$("svg");
  for (const handle of handles) {
    const box = await handle.boundingBox();
    if (!box || box.width < 1 || box.height < 1) {
      await handle.dispose();
      continue;
    }

    const png = await handle.screenshot({ type: "png", omitBackground: true });
    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
    await handle.evaluate((svg, src) => {
      const replacement = document.createElement("img");
      replacement.src = src;
      replacement.alt = svg.getAttribute("aria-label") || "";
      replacement.style.maxWidth = "100%";
      replacement.style.height = "auto";
      replacement.style.display = "block";
      replacement.style.margin = "0 auto";
      svg.replaceWith(replacement);
    }, dataUrl);
    await handle.dispose();
  }
}

async function printPdf(page, htmlPath, outputPath, config) {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
  await rasterizeInlineSvgs(page);
  await page.waitForTimeout(1200);
  const cdp = await page.context().newCDPSession(page);
  const pdf = await cdp.send("Page.printToPDF", config.chromePdfOptions);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(pdf.data, "base64"));
}

async function renderJob(config, browser, jobName, buildQmd, outputFile) {
  const printDir = path.join(projectRoot, config.buildDir, jobName);
  fs.rmSync(printDir, { recursive: true, force: true });
  fs.mkdirSync(printDir, { recursive: true });

  const printQmd = await buildQmd(printDir);
  const printHtml = renderPrintHtml(config, printQmd, printDir);
  const outputPath = path.join(projectRoot, config.outputDir, outputFile);
  const page = await browser.newPage();
  try {
    await printPdf(page, printHtml, outputPath, config);
  } finally {
    await page.close();
  }
  console.log(`PDF written: ${outputPath}`);
}

async function main() {
  const config = loadConfig();
  fs.mkdirSync(path.join(projectRoot, config.outputDir), { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumPath,
    args: ["--no-sandbox"],
  });

  try {
    await renderJob(
      config,
      browser,
      config.servercore.name,
      (printDir) => buildServerCoreQmd(config, printDir, browser),
      config.servercore.output,
    );

    for (const pageConfig of config.pages) {
      await renderJob(
        config,
        browser,
        pageConfig.name,
        (printDir) => buildPageQmd(config, pageConfig, printDir, browser),
        pageConfig.output,
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
