import * as fs from "fs";
import * as path from "path";

function convertTTFToBase64() {
  try {
    // Читаємо TTF файл
    const fontPath = path.join(process.cwd(), "public/fonts/NotoSans.ttf");
    const fontBuffer = fs.readFileSync(fontPath);

    // Конвертуємо в base64
    const base64Font = fontBuffer.toString("base64");

    // Створюємо JavaScript файл для jsPDF
    const fontModule = `// Auto-generated font file for jsPDF
import { jsPDF } from 'jspdf';

const NotoSansFont = '${base64Font}';

// Додаємо шрифт до jsPDF
jsPDF.API.events.push([
  'addFonts',
  function() {
    this.addFileToVFS('NotoSans.ttf', NotoSansFont);
    this.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  }
]);

export default NotoSansFont;
`;

    // Зберігаємо згенерований файл
    const outputPath = path.join(process.cwd(), "lib/fonts/noto-sans-font.js");

    // Створюємо директорію якщо її немає
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, fontModule);

    console.log("✅ Font converted successfully!");
    console.log(`📁 Output: ${outputPath}`);
    console.log(
      `📊 Original size: ${(fontBuffer.length / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
      `📊 Base64 size: ${(base64Font.length / 1024 / 1024).toFixed(2)} MB`
    );
  } catch (error) {
    console.error("❌ Font conversion failed:", error.message);
  }
}

// Запускаємо конвертацію
convertTTFToBase64();
