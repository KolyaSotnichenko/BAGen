import { ECBA_SYSTEM_PROMPT } from "@/shared/prompts";
import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";

// Типи для запиту
interface GenerateTestRequest {
  level: "ecba" | "ccba" | "cbap";
  questionCount: number;
  language: string;
  customPrompt?: string;
  testType?: "basic" | "detailed" | "babok" | "practical";
  systemPrompt?: string; // Системний промпт від користувача
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

interface GenerateTestResponse {
  success: boolean;
  response: string;
  error?: string;
}

// Ініціалізація Azure OpenAI клієнта
const azureOpenAI = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

// ID асистента з .env файлу
const ASSISTANT_ID = process.env.AZURE_OPENAI_ASSISTANT_ID;

// Системні промпти за замовчуванням для різних рівнів
const defaultSystemPrompts = {
  ecba: ECBA_SYSTEM_PROMPT,
  ccba: `Створи {{questions}} тестових питань для сертифікації CCBA (Certification of Capability in Business Analysis).
Включи питання середнього рівня складності, які покривають всі області знань BABOK, техніки та базові компетенції.
Питання повинні відображати досвід роботи 3-5 років у сфері BA.
Відповідай {{language}} мовою.`,
  cbap: `Створи {{questions}} тестових питань для сертифікації CBAP (Certified Business Analysis Professional).
Створи складні питання, які вимагають глибокого розуміння BABOK, аналізу складних сценаріїв та стратегічного мислення.
Питання повинні бути підходящими для досвідчених бізнес-аналітиків з досвідом роботи 5+ років.
Відповідай {{language}} мовою.`,
};

export async function POST(request: NextRequest) {
  try {
    const body: GenerateTestRequest = await request.json();

    // Валідація вхідних даних
    if (!body.level || !["ecba", "ccba", "cbap"].includes(body.level)) {
      return NextResponse.json(
        { success: false, error: "Невірний рівень сертифікації" },
        { status: 400 }
      );
    }

    if (
      !body.questionCount ||
      body.questionCount < 1 ||
      body.questionCount > 200
    ) {
      return NextResponse.json(
        { success: false, error: "Кількість питань повинна бути від 1 до 200" },
        { status: 400 }
      );
    }

    if (!body.language) {
      return NextResponse.json(
        { success: false, error: "Мова не вказана" },
        { status: 400 }
      );
    }

    if (!ASSISTANT_ID) {
      return NextResponse.json(
        { success: false, error: "ID асистента не налаштований" },
        { status: 500 }
      );
    }

    // Визначаємо дефолтний системний промпт
    const baseSystemPrompt = defaultSystemPrompts[body.level];

    // Формування промпту
    const testType = body.testType || "basic";
    let userPrompt = body.customPrompt || "";

    // Логування змінних перед заміною плейсхолдерів
    console.log("🔍 Змінні для системного промпту:");
    console.log("  - level:", body.level);
    console.log("  - questionCount:", body.questionCount);
    console.log("  - language:", body.language);
    console.log("  - testType:", testType);
    console.log(
      "  - baseSystemPrompt (перші 100 символів):",
      baseSystemPrompt.substring(0, 100) + "..."
    );
    console.log(
      "  - userPrompt (перші 100 символів):",
      userPrompt.substring(0, 100) + "..."
    );

    // Заміна плейсхолдерів у кастомному промпті користувача
    userPrompt = userPrompt
      .replace(/\{\{questions\}\}/g, body.questionCount.toString())
      .replace(/\{\{level\}\}/g, body.level.toUpperCase())
      .replace(/\{\{language\}\}/g, body.language);

    console.log(
      "📝 Кастомний промпт після заміни плейсхолдерів (перші 200 символів):",
      userPrompt.substring(0, 200) + "..."
    );

    // Додаємо інструкції для форматування відповіді
    const formatInstructions = `

Надай відповідь у чистому Markdown, без JSON.
Мова відповіді: ${body.language}
Переконайся, що всі питання та варіанти відповідей написані мовою: ${body.language}`;

    // Повний промпт: дефолтний + кастомний + інструкції форматування
    const fullPrompt = `${baseSystemPrompt}\n\n${userPrompt}\n\n${formatInstructions}`;

    console.log(
      "🚀 Повний промпт для LLM (довжина):",
      fullPrompt.length,
      "символів"
    );
    console.log(
      "🚀 Повний промпт (перші 300 символів):",
      fullPrompt.substring(0, 300) + "..."
    );

    // Отримуємо поточну конфігурацію асистента та логуємо tools
    const assistant = await azureOpenAI.beta.assistants.retrieve(ASSISTANT_ID);
    console.log(
      "🔧 Assistant tools:",
      (assistant.tools || []).map((t: any) => t.type)
    );
    if (!assistant.tools?.some((t: any) => t.type === "code_interpreter")) {
      console.warn(
        "⚠️ Увага: у асистента відсутній code_interpreter у списку tools"
      );
    }

    // Створюємо thread
    const thread = await azureOpenAI.beta.threads.create();

    // Додаємо повідомлення до thread
    await azureOpenAI.beta.threads.messages.create(thread.id, {
      role: "user",
      content: fullPrompt,
    });

    // Запускаємо асистента
    const run = await azureOpenAI.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Очікуємо завершення виконання
    let runStatus = await azureOpenAI.beta.threads.runs.retrieve(
      thread.id,
      run.id
    );

    // Polling для очікування завершення (максимум 120 секунд)
    let attempts = 0;
    const maxAttempts = 600;

    while (
      (runStatus.status === "queued" || runStatus.status === "in_progress") &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await azureOpenAI.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );
      attempts++;
    }

    if (runStatus.status === "completed") {
      // Дістаємо кроки виконання run, щоб перевірити використання code interpreter
      let codeInterpreterUsed = false;
      try {
        const steps = await azureOpenAI.beta.threads.runs.steps.list(
          thread.id,
          run.id
        );
        console.log("🧪 Кількість кроків run:", steps.data.length);
        for (const step of steps.data) {
          const details: any =
            (step as any).step_details || (step as any).details;
          const toolCalls: any[] = details?.tool_calls || [];
          for (const tc of toolCalls) {
            const type = tc.type || tc?.tool_call_type;
            if (type === "code_interpreter" || type === "code") {
              codeInterpreterUsed = true;
            }
          }
        }
        console.log("🧪 Code Interpreter використано:", codeInterpreterUsed);
      } catch (e) {
        console.warn(
          "⚠️ Не вдалося отримати кроки run для перевірки code interpreter:",
          e
        );
      }

      // Отримуємо повідомлення з thread
      const messages = await azureOpenAI.beta.threads.messages.list(thread.id);
      console.log("🧪 Всього повідомлень у thread:", messages.data.length);

      // Підбираємо перше повідомлення асистента з текстом і об'єднуємо всі текстові частини
      const pickAssistantText = (): string => {
        for (const msg of messages.data) {
          if (msg.role !== "assistant") continue;
          const types = (msg.content || []).map((c: any) => c.type);
          console.log("🧪 Типи контенту повідомлення асистента:", types);
          const textParts = (msg.content || [])
            .filter((c: any) => c.type === "text" && c.text)
            .map((c: any) =>
              typeof c.text === "string" ? c.text : c.text.value
            )
            .filter(Boolean);
          if (textParts.length) {
            return textParts.join("\n").trim();
          }
        }
        return "";
      };

      // Знайти перше зображення, повернуте як image_file, і завантажити його як data URI
      const pickFirstImageFileId = (): string | null => {
        for (const msg of messages.data) {
          if (msg.role !== "assistant") continue;
          for (const c of msg.content || []) {
            if (c.type === "image_file" && c.image_file?.file_id) {
              return c.image_file.file_id;
            }
          }
        }
        return null;
      };

      let imageDataUri: string | null = null;
      const imageFileId = pickFirstImageFileId();
      if (imageFileId) {
        try {
          const meta = await azureOpenAI.files.retrieve(imageFileId);
          const filename = (meta as any)?.filename || "";
          let mime = "image/png";
          if (
            filename.toLowerCase().endsWith(".jpg") ||
            filename.toLowerCase().endsWith(".jpeg")
          )
            mime = "image/jpeg";
          else if (filename.toLowerCase().endsWith(".png")) mime = "image/png";

          const fileResp: any = await azureOpenAI.files.content(imageFileId);
          let arrayBuffer: ArrayBuffer | null = null;
          if (typeof fileResp.arrayBuffer === "function") {
            arrayBuffer = await fileResp.arrayBuffer();
          } else if (fileResp?.data) {
            arrayBuffer = fileResp.data as ArrayBuffer;
          } else if (typeof fileResp.blob === "function") {
            const blob = await fileResp.blob();
            arrayBuffer = await blob.arrayBuffer();
          } else if (
            fileResp?.body &&
            typeof fileResp.body.arrayBuffer === "function"
          ) {
            arrayBuffer = await fileResp.body.arrayBuffer();
          }

          if (arrayBuffer) {
            const base64 = Buffer.from(arrayBuffer as any).toString("base64");
            imageDataUri = `data:${mime};base64,${base64}`;
            console.log("🖼️ Отримано зображення від асистента:", {
              imageFileId,
              filename,
              mime,
              size: (arrayBuffer as any).byteLength,
            });
          } else {
            console.warn("⚠️ Не вдалося отримати байти з image_file відповіді");
          }
        } catch (e) {
          console.warn("⚠️ Не вдалося завантажити image_file контент:", e);
        }
      }

      const responseText = pickAssistantText();
      const finalMarkdown = (() => {
        if (responseText && imageDataUri)
          return `${responseText}\n\n![Generated Image](${imageDataUri})`;
        if (responseText) return responseText;
        if (imageDataUri) return `![Generated Image](${imageDataUri})`;
        return "";
      })();

      if (finalMarkdown) {
        // Повертаємо сирий текст (Markdown) з можливим вбудованим зображенням + діагностичні заголовки
        return new NextResponse(finalMarkdown, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Code-Interpreter-Used": codeInterpreterUsed ? "true" : "false",
            "X-Thread-Id": thread.id,
            "X-Run-Id": run.id,
            "X-Image-Embedded": imageDataUri ? "true" : "false",
          },
        });
      }

      // Якщо немає тексту і немає зображення — повертаємо 200 з поясненням
      console.warn(
        "⚠️ Асистент завершився без текстового контенту та без зображень."
      );
      return new NextResponse(
        "⚠️ Асистент згенерував результат без текстового Markdown та без зображень. Додайте до промпту інструкцію вставляти зображення як інлайн data:image/png;base64,... у Markdown.",
        {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Code-Interpreter-Used": codeInterpreterUsed ? "true" : "false",
            "X-Thread-Id": thread.id,
            "X-Run-Id": run.id,
            "X-Image-Embedded": "false",
          },
        }
      );
    } else if (runStatus.status === "failed") {
      console.error("Асистент не зміг виконати запит:", runStatus.last_error);
      return NextResponse.json(
        {
          success: false,
          error: `Асистент не зміг згенерувати тест: ${
            runStatus.last_error?.message || "Невідома помилка"
          }`,
        },
        { status: 500 }
      );
    } else if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: "Таймаут виконання запиту (120 секунд)" },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Неочікувана помилка при роботі з асистентом" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Помилка генерації тесту:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Невідома помилка",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API для генерації тестів працює з Azure Assistants API",
    endpoints: {
      POST: "/api/generate-test - Генерація тестових питань",
      GET: "/api/generate-test - Інформація про API",
    },
    supportedLevels: ["ecba", "ccba", "cbap"],
    supportedTestTypes: ["basic", "detailed", "babok", "practical"],
    features: [
      "Підтримка системних промптів від користувача",
      "Azure Assistants API інтеграція",
      "Автоматичне управління threads та runs",
      "Розширений таймаут (120 секунд)",
    ],
    assistantId: ASSISTANT_ID || "не налаштований",
  });
}
