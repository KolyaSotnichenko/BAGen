import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { marked } from "marked";
import { NotoSansBase64 } from "../../../lib/NotoSans-base64.js";

export const runtime = "nodejs";

interface GeneratePDFRequest {
  llmResponse: string;
  level?: string;
  language?: string;
}

// Helper: sanitize markdown to fix broken Cyrillic spacing and ensure data URI images are valid
function sanitizeMarkdown(src: string): string {
  let s = src;
  // Remove zero-width characters that may cause odd spacing
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // Normalize Windows/Mac line endings
  s = s.replace(/\r\n?/g, "\n");

  // Unwrap fenced code blocks that contain data URI images
  s = s.replace(/```[\s\S]*?```/g, (block) => {
    const match = block.match(/!\[[\s\S]*?\]\s*\(\s*data:image\/(?:png|jpeg|jpg);base64,[\s\S]*?\)/i);
    if (match) {
      return match[0]; // return the image markdown without code fencing
    }
    const raw = block.match(/data:image\/(?:png|jpeg|jpg);base64,[A-Za-z0-9+/=\s]+/i);
    if (raw) {
      const cleaned = raw[0].replace(/\s+/g, "");
      return `<img src="${cleaned}" alt="Embedded image" />`;
    }
    return block;
  });

  // Unindent image markdown lines that might be treated as code due to leading spaces
  s = s.replace(/^(\s{4,})(!\[[\s\S]*?\]\s*\(\s*data:image\/(?:png|jpeg|jpg);base64,[\s\S]*?\))/gm, (_m, _indent, img) => img);

  // Convert markdown image with data URI to HTML <img> and strip whitespace in base64
  s = s.replace(/!\[([^\]]*)\]\s*\(\s*(data:image\/(?:png|jpeg|jpg);base64,[\s\S]*?)\)/gi, (_m, alt, uri) => {
    const cleaned = String(uri).replace(/\s+/g, "");
    return `<img src="${cleaned}" alt="${alt}" />`;
  });

  // Convert standalone raw data URI occurrences to <img>
  s = s.replace(/(^|\n)\s*(data:image\/(?:png|jpeg|jpg);base64,[A-Za-z0-9+/=\s]+)/gi, (_m, prefix, uri) => {
    const cleaned = String(uri).replace(/\s+/g, "");
    return `${prefix}<img src="${cleaned}" alt="Embedded image" />`;
  });

  return s;
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
    const contentHtml = marked.parse(sanitizedMarkdown);

    // 2) Обгортка HTML з базовими стилями для друку
    const fullHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${(level || 'BA Test').toUpperCase()} — Generated Test</title>
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
  </style>
</head>
<body>
  <h1 style="margin-top:0;">${(level || 'BA Test').toUpperCase()}</h1>
  <div>${contentHtml}</div>
</body>
</html>`;

    // 3) Генеруємо PDF через Puppeteer
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (await puppeteer.executablePath());
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
    });
    const page = await browser.newPage();

    // Increase default timeouts to avoid Navigation timeout errors on slower environments
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // Use a less strict lifecycle event and extend timeout for setContent
    await page.setContent(fullHtml, { waitUntil: "load", timeout: 120000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });

    await browser.close();

    console.log("✅ PDF згенеровано успішно через Puppeteer");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(level || 'ba')}-test-${Date.now()}.pdf"`,
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

export async function GET() {
  return NextResponse.json({
    message: "PDF Generation API is working with Noto Sans font support",
    timestamp: new Date().toISOString(),
  });
}
