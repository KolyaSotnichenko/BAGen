import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";
import { marked } from "marked";
import { NotoSansBase64 } from "../../../lib/NotoSans-base64.js";

export const dynamic = "force-dynamic";

const remoteExecutablePath =
  "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.x64.tar";
let browser: any;

interface GeneratePDFRequest {
  llmResponse: string;
  level?: string;
  language?: string;
}

// Helper: sanitize markdown to fix broken Cyrillic spacing and ensure data URI images are valid
function sanitizeMarkdown(src: string): string {
  let s = src;
  let imageCount = 0;

  // Remove zero-width characters that may cause odd spacing
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // Normalize Windows/Mac line endings
  s = s.replace(/\r\n?/g, "\n");

  // Unwrap fenced code blocks that contain data URI images
  s = s.replace(/```[\s\S]*?```/g, (block) => {
    const match = block.match(
      /!\[[\s\S]*?\]\s*\(\s*data:image\/(?:png|jpeg|jpg|gif|webp);base64,[\s\S]*?\)/i
    );
    if (match) {
      imageCount++;
      console.log(`🖼️ Знайдено картинку ${imageCount} в code block`);
      return match[0]; // return the image markdown without code fencing
    }
    const raw = block.match(
      /data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=\s]+/i
    );
    if (raw) {
      imageCount++;
      const cleaned = raw[0].replace(/\s+/g, "");
      console.log(
        `🖼️ Знайдено raw data URI ${imageCount}, довжина: ${cleaned.length}`
      );
      return `<img src="${cleaned}" alt="Embedded image" style="max-width: 100%; height: auto; display: block; margin: 10px 0;" />`;
    }
    return block;
  });

  // Unindent image markdown lines that might be treated as code due to leading spaces
  s = s.replace(
    /^(\s{4,})(!\[[\s\S]*?\]\s*\(\s*data:image\/(?:png|jpeg|jpg|gif|webp);base64,[\s\S]*?\))/gm,
    (_m, _indent, img) => {
      imageCount++;
      console.log(`🖼️ Знайдено відступну картинку ${imageCount}`);
      return img;
    }
  );

  // Convert markdown image with data URI to HTML <img> and strip whitespace in base64
  s = s.replace(
    /!\[([^\]]*)\]\s*\(\s*(data:image\/(?:png|jpeg|jpg|gif|webp);base64,[\s\S]*?)\)/gi,
    (_m, alt, uri) => {
      imageCount++;
      const cleaned = String(uri).replace(/\s+/g, "");
      console.log(
        `🖼️ Конвертую markdown картинку ${imageCount}, alt: "${alt}", довжина URI: ${cleaned.length}`
      );
      return `<img src="${cleaned}" alt="${
        alt || "Generated image"
      }" style="max-width: 100%; height: auto; display: block; margin: 10px 0; border: 1px solid #e2e8f0;" />`;
    }
  );

  // Convert standalone raw data URI occurrences to <img>
  s = s.replace(
    /(^|\n)\s*(data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=\s]+)/gi,
    (_m, prefix, uri) => {
      imageCount++;
      const cleaned = String(uri).replace(/\s+/g, "");
      console.log(
        `🖼️ Конвертую standalone URI ${imageCount}, довжина: ${cleaned.length}`
      );
      return `${prefix}<img src="${cleaned}" alt="Embedded image" style="max-width: 100%; height: auto; display: block; margin: 10px 0; border: 1px solid #e2e8f0;" />`;
    }
  );

  // Convert general Markdown image notation to HTML <img> (non-data URIs)
  s = s.replace(/!\[([^\]]*)\]\s*\(\s*([^\)]+)\s*\)/g, (m, alt, url) => {
    const srcVal = String(url || "").trim();
    // Skip if already data URI (handled above)
    if (/^data:/i.test(srcVal)) return m;
    imageCount++;
    const safeAlt = String(alt || "").replace(/"/g, "&quot;");
    return `<img src="${srcVal}" alt="${safeAlt}" />`;
  });

  // Remove/neutralize unknown URL schemes in src/href attributes
  const knownSchemes = ["http", "https", "data", "blob", "file", "about"];
  let unknownCount = 0;
  s = s.replace(/\s(src|href)="([^"]+)"/gi, (_m, attr, url) => {
    const v = String(url);
    const schemeMatch = v.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):/);
    const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : "";
    if (scheme && !knownSchemes.includes(scheme)) {
      unknownCount++;
      return ` ${attr}="" data-removed-url="${v.replace(/"/g, "")}"`;
    }
    return ` ${attr}="${v}"`;
  });

  if (unknownCount > 0) {
    console.warn("🧹 Санітизація: видалено невідомих URL схем:", unknownCount);
  }

  console.log(`📊 Загалом знайдено та оброблено ${imageCount} картинок`);
  return s;
}

async function getBrowser() {
  if (browser) return browser;

  if (process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT === "production") {
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(remoteExecutablePath),
      headless: true,
    });
  } else {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
  }

  return browser;
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 PDF Generation started");

    const body: GeneratePDFRequest = await request.json();

    const { llmResponse, level, language } = body;

    if (!llmResponse || llmResponse.trim().length === 0) {
      console.error("❌ LLM response is empty");
      return NextResponse.json(
        { success: false, error: "Відповідь LLM порожня або не надана" },
        { status: 400 }
      );
    }

    console.log("🔄 Початок генерації PDF з HTML...");

    // 1) Санітуємо Markdown та конвертуємо → HTML
    const sanitizedMarkdown = sanitizeMarkdown(llmResponse);
    console.log(
      "🧩 Довжина санітізованого Markdown:",
      sanitizedMarkdown.length
    );
    const contentHtml = marked.parse(sanitizedMarkdown);
    console.log("🧩 Довжина згенерованого HTML:", String(contentHtml).length);

    // 2) Обгортка HTML з базовими стилями для друку
    const fullHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${(level || "BA Test").toUpperCase()} — Generated Test</title>
  <style>
    @page { size: A4; margin: 20mm; }
    @font-face {
      font-family: 'Noto Sans';
      src: url(data:font/ttf;base64,${NotoSansBase64}) format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    body { font-family: 'Noto Sans', Arial, Helvetica, sans-serif; color: #1a202c; }
    h1, h2, h3 { color: #2d3748; }
    pre, code { background: #f7fafc; border-radius: 6px; padding: 8px; }
    ul { padding-left: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e2e8f0; padding: 6px; }
    img { max-width: 100%; height: auto; display: block; }
    .mermaid { page-break-inside: avoid; margin: 12px 0; }
    .mermaid svg { max-width: 100% !important; height: auto !important; display: block; }
  </style>
</head>
<body>
  <h1 style="margin-top:0;">${(level || "BA Test").toUpperCase()}</h1>
  <div>${contentHtml}</div>
</body>
</html>`;
    console.log("🧩 Довжина повного HTML для рендеру:", fullHtml.length);

    // 3) Генеруємо PDF через Puppeteer
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    // Консоль сторінки → серверні логи
    page.on("console", (msg: any) => {
      try {
        console.log("🖥️ Page console:", msg.type(), msg.text());
      } catch (_) {}
    });

    // Increase default timeouts to avoid Navigation timeout errors on slower environments
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    console.log("📄 Встановлюю контент у сторінку...");
    // Менш строгий тригер, щоб не зависати на мережевих запитах
    await page.setContent(fullHtml, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    console.log("📄 Контент встановлено.");

    // Якщо використовуються Mermaid-блоки, можна логувати їх кількість
    const mermaidBlocks = await page.evaluate(
      () => document.querySelectorAll(".mermaid").length
    );
    console.log("📐 Кількість .mermaid блоків у DOM:", mermaidBlocks);

    console.log("🖼️ Починаю очікування картинок...");
    // Дочікуємося завантаження всіх картинок на сторінці
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve(true)
            : new Promise((resolve) => {
                const onDone = () => resolve(true);
                img.addEventListener("load", onDone, { once: true });
                img.addEventListener("error", onDone, { once: true });
              })
        )
      );
    });
    console.log("🖼️ Очікування картинок завершено.");

    // Збираємо статистику по картинках для логування
    const imageStats = await page.evaluate(() => {
      const imgs = Array.from(document.images);
      const mermaidSvgs = Array.from(
        document.querySelectorAll(".mermaid svg")
      ).length;
      return {
        totalImages: imgs.length,
        loadedImages: imgs.filter((img) => img.complete && img.naturalWidth > 0)
          .length,
        mermaidSvgCount: mermaidSvgs,
        details: imgs.slice(0, 50).map((img) => ({
          src: (img.src || "").slice(0, 120),
          complete: img.complete,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })),
      };
    });
    console.log("📷 Статистика зображень та Mermaid:", imageStats);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });

    await page.close();

    console.log(
      "✅ PDF згенеровано успішно через Puppeteer, байт:",
      pdfBuffer.byteLength
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "X-PDF-Bytes": String(pdfBuffer.byteLength),
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("❌ PDF Generation Error:", err);
    console.error("❌ Full error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Помилка генерації PDF",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url");

  if (!urlParam) {
    return new NextResponse("Please provide a URL.", { status: 400 });
  }

  // Prepend http:// if missing
  let inputUrl = urlParam.trim();
  if (!/^https?:\/\//i.test(inputUrl)) {
    inputUrl = `http://${inputUrl}`;
  }

  // Validate the URL is a valid HTTP/HTTPS URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(inputUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return new NextResponse("URL must start with http:// or https://", {
        status: 400,
      });
    }
  } catch {
    return new NextResponse("Invalid URL provided.", { status: 400 });
  }

  try {
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    await page.goto(parsedUrl.toString(), { waitUntil: "networkidle2" });
    const screenshot = await page.screenshot({ type: "png" });

    await page.close();

    return new NextResponse(screenshot, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="screenshot.png"',
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse(
      "An error occurred while generating the screenshot.",
      { status: 500 }
    );
  }
}
