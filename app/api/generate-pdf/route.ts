import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
// Імпортуємо наш конвертований шрифт
import "../../../lib/fonts/noto-sans-font";

interface GeneratePDFRequest {
  level: "ecba" | "ccba" | "cbap";
  questionCount: number;
  language: string;
  questions: TestQuestion[];
  testType?: "basic" | "detailed" | "babok" | "practical";
}

interface TestQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  knowledgeArea?: string;
  difficulty: "easy" | "medium" | "hard";
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 PDF Generation started");

    const body: GeneratePDFRequest = await request.json();

    if (!body.questions || body.questions.length === 0) {
      console.error("❌ No questions provided");
      return NextResponse.json(
        { success: false, error: "Питання не надані або порожні" },
        { status: 400 }
      );
    }

    console.log("🔄 Початок генерації PDF...");

    // Створюємо PDF документ
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    console.log("✅ jsPDF документ створено успішно");

    const localizedTexts = {
      english: {
        testTitle: `${body.level.toUpperCase()} Test Questions`,
        questionCount: `Total Questions: ${body.questions.length}`,
        createdDate: `Created: ${new Date().toLocaleDateString()}`,
        correctAnswer: "Correct Answer:",
      },
    };

    const texts =
      localizedTexts[body.language as keyof typeof localizedTexts] ||
      localizedTexts.english;

    let currentY = 20;
    const pageHeight = 297;
    const margin = 20;
    const lineHeight = 7;

    // Функція для додавання тексту з автоматичним переносом
    function addText(
      text: string,
      x: number,
      y: number,
      maxWidth: number = 170
    ): number {
      try {
        // Нормалізуємо текст для кращої підтримки Unicode
        const normalizedText = text.normalize("NFC");
        const lines = doc.splitTextToSize(normalizedText, maxWidth);
        doc.text(lines, x, y);
        return y + lines.length * lineHeight;
      } catch (error) {
        console.warn("⚠️ Text processing warning:", error);
        // Fallback
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + lines.length * lineHeight;
      }
    }

    function checkNewPage(requiredSpace: number = 30): void {
      if (currentY + requiredSpace > pageHeight - margin) {
        doc.addPage();
        currentY = margin;

        // Встановлюємо шрифт для нової сторінки
        try {
          if (body.language === "ukrainian") {
            doc.setFont("NotoSans", "normal");
          } else {
            doc.setFont("helvetica", "normal");
          }
        } catch (error) {
          doc.setFont("helvetica", "normal");
        }
      }
    }

    // Функція для встановлення шрифту з fallback
    function setFontSafe(font: string, style: string): void {
      try {
        if (body.language === "ukrainian" && font === "helvetica") {
          doc.setFont("NotoSans", style);
        } else {
          doc.setFont(font, style);
        }
      } catch (error) {
        console.warn(
          `⚠️ Font setting warning for ${font}:${style}, using fallback`
        );
        doc.setFont("helvetica", style);
      }
    }

    // Додаємо заголовок
    doc.setFontSize(16);
    setFontSafe("helvetica", "bold");
    currentY = addText(texts.testTitle, margin, currentY);
    currentY += 10;

    // Додаємо інформацію про тест
    doc.setFontSize(12);
    setFontSafe("helvetica", "normal");
    currentY = addText(texts.questionCount, margin, currentY);
    currentY = addText(texts.createdDate, margin, currentY);
    currentY += 15;

    // Додаємо питання
    body.questions.forEach((question, index) => {
      checkNewPage(50);

      // Номер питання
      doc.setFontSize(14);
      setFontSafe("helvetica", "bold");
      currentY = addText(
        `${index + 1}. ${question.question}`,
        margin,
        currentY
      );
      currentY += 5;

      // Варіанти відповідей
      doc.setFontSize(12);
      setFontSafe("helvetica", "normal");
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D
        currentY = addText(`${optionLetter}. ${option}`, margin + 10, currentY);
      });

      currentY += 5;

      // Правильна відповідь
      doc.setFontSize(10);
      setFontSafe("helvetica", "bold");
      const correctLetter = String.fromCharCode(65 + question.correctAnswer);
      currentY = addText(
        `${texts.correctAnswer} ${correctLetter}`,
        margin + 10,
        currentY
      );

      currentY += 15;
    });

    console.log("📝 PDF content generated successfully with Noto Sans font");

    // Генеруємо PDF як ArrayBuffer
    const pdfArrayBuffer = doc.output("arraybuffer");

    console.log("✅ PDF generated successfully");

    // Повертаємо PDF як blob response
    return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${
          body.level
        }-test-${Date.now()}.pdf"`,
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
