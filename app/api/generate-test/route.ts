import { ECBA_SYSTEM_PROMPT } from "@/shared/prompts";
import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { RunCreateParamsNonStreaming } from "openai/resources/beta/threads/runs/runs.mjs";
import { marked } from "marked"; // додано: конвертація Markdown → HTML

// Типи для запиту
interface GenerateTestRequest {
  level: "ecba" | "ccba" | "cbap";
  questionCount: number;
  language: string;
  customPrompt?: string;
  testType?: "basic" | "detailed" | "babok" | "practical";
  systemPrompt?: string; // Системний промпт від користувача
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

    // Додано: змінні для діагностики (час, ідентифікатори)
    const startedAt = Date.now();
    let threadId: string | undefined;
    let runId: string | undefined;
    const executedRuns: string[] = [];

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

    // Заміна плейсхолдерів у кастомному промпті користувача
    userPrompt = userPrompt
      .replace(/\{\{questions\}\}/g, body.questionCount.toString())
      .replace(/\{\{level\}\}/g, body.level.toUpperCase())
      .replace(/\{\{language\}\}/g, body.language);

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
    threadId = thread.id;

    // Додаємо повідомлення до thread
    await azureOpenAI.beta.threads.messages.create(thread.id, {
      role: "user",
      content: fullPrompt,
    });

    const runOptions: RunCreateParamsNonStreaming = {
      assistant_id: ASSISTANT_ID,
    };
    const hasFileSearch = assistant.tools?.some(
      (t: any) => t.type === "file_search"
    );
    const hasCodeInterpreter = assistant.tools?.some(
      (t: any) => t.type === "code_interpreter"
    );

    if (hasFileSearch) {
      runOptions.tool_choice = { type: "file_search" };
      console.log("🧪 Фаза 1: використовую tool_choice=file_search");
    } else if (hasCodeInterpreter) {
      runOptions.tool_choice = { type: "code_interpreter" };
      console.log(
        "🧪 Фаза 1: file_search недоступний, використовую code_interpreter"
      );
    } else {
      console.log(
        "🧪 Фаза 1: жоден з tools (file_search/code_interpreter) недоступний, запускаю без tool_choice"
      );
    }

    // Запускаємо перший run (Фаза 1)
    const run = await azureOpenAI.beta.threads.runs.create(
      thread.id,
      runOptions
    );
    runId = run.id;
    executedRuns.push(run.id);

    // Очікуємо завершення виконання Фази 1
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

    console.log("🏁 Run status after polling (Phase 1):", {
      status: runStatus.status,
      attempts,
      elapsedMs: Date.now() - startedAt,
      threadId,
      runId,
    });

    if (runStatus.status === "completed") {
      // Отримуємо повідомлення після Фази 1
      const messagesAfterPhase1 = await azureOpenAI.beta.threads.messages.list(
        thread.id
      );
      const assistantTexts = (messagesAfterPhase1.data || [])
        .filter((m: any) => m.role === "assistant")
        .flatMap((m: any) =>
          (m.content || [])
            .filter((c: any) => c.type === "text")
            .map((c: any) =>
              typeof c.text === "string" ? c.text : c.text?.value || ""
            )
        );
      const combinedAssistantText = assistantTexts.join("\n\n");

      // Витягуємо кодові блоки з відповіді
      const extractCodeBlocks = (
        text: string
      ): Array<{ lang: string; code: string }> => {
        const blocks: Array<{ lang: string; code: string }> = [];
        const re = /```([\w+-]*)?\n([\s\S]*?)```/g;
        let match;
        while ((match = re.exec(text)) !== null) {
          const lang = (match[1] || "").trim();
          const code = (match[2] || "").trim();
          if (code) blocks.push({ lang, code });
        }
        return blocks;
      };
      const codeBlocks = extractCodeBlocks(combinedAssistantText);
      console.log(
        "🔎 Знайдено кодових блоків у відповіді Фази 1:",
        codeBlocks.length
      );

      // Якщо є код — запускаємо Фазу 2: виконай код у code_interpreter
      let secondRunId: string | undefined;
      let secondRunStatus: any | undefined;

      if (codeBlocks.length > 0 && hasCodeInterpreter) {
        const followUpContent =
          `Будь ласка, виконай наведений нижче код у code_interpreter.\n\n` +
          codeBlocks
            .map((b) => `\`\`\`${b.lang || ""}\n${b.code}\n\`\`\``)
            .join("\n\n");

        await azureOpenAI.beta.threads.messages.create(thread.id, {
          role: "user",
          content: followUpContent,
        });

        const run2Options: RunCreateParamsNonStreaming = {
          assistant_id: ASSISTANT_ID,
          tool_choice: { type: "code_interpreter" },
        };
        console.log("🧪 Фаза 2: запуск code_interpreter із переданим кодом");
        const run2 = await azureOpenAI.beta.threads.runs.create(
          thread.id,
          run2Options
        );
        secondRunId = run2.id;
        executedRuns.push(run2.id);

        // Очікуємо завершення Фази 2
        secondRunStatus = await azureOpenAI.beta.threads.runs.retrieve(
          thread.id,
          run2.id
        );
        let attempts2 = 0;
        while (
          (secondRunStatus.status === "queued" ||
            secondRunStatus.status === "in_progress") &&
          attempts2 < maxAttempts
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          secondRunStatus = await azureOpenAI.beta.threads.runs.retrieve(
            thread.id,
            run2.id
          );
          attempts2++;
        }
        console.log("🏁 Run status after polling (Phase 2):", {
          status: secondRunStatus.status,
          attempts: attempts2,
          threadId,
          runId: secondRunId,
        });

        if (secondRunStatus.status !== "completed") {
          console.warn(
            "⚠️ Фаза 2 не завершилась успішно:",
            secondRunStatus.status,
            secondRunStatus.last_error
          );
        }
      }

      // Збираємо кроки виконання зі всіх запусків, щоб перевірити використання code interpreter
      let codeInterpreterUsed = false;
      let runStepsData: any[] = [];
      for (const rId of executedRuns) {
        try {
          const steps = await azureOpenAI.beta.threads.runs.steps.list(
            thread.id,
            rId
          );
          const currentSteps = steps.data || [];
          runStepsData = runStepsData.concat(currentSteps);
          for (const step of currentSteps) {
            const details: any =
              (step as any).step_details || (step as any).details;
            const toolCalls: any[] = details?.tool_calls || [];

            for (const tc of toolCalls) {
              const type = tc.type || tc?.tool_call_type;
              if (type === "code_interpreter" || type === "code") {
                codeInterpreterUsed = true;
                const outputs: any[] =
                  tc.code_interpreter?.outputs || tc.outputs || [];
                console.log(
                  "🔍 code_interpreter outputs count:",
                  outputs?.length || 0
                );
                for (const out of outputs || []) {
                  const outType =
                    out?.type ||
                    (out?.image ? "image" : null) ||
                    (out?.logs ? "logs" : null) ||
                    (out?.file ? "file" : null);
                  const fileId =
                    out?.image?.file_id ||
                    out?.image_file?.file_id ||
                    out?.file?.file_id ||
                    out?.file_id ||
                    null;
                  console.log("🔍 output item:", {
                    type: outType,
                    fileId,
                    keys: Object.keys(out || {}),
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn(
            "⚠️ Не вдалося отримати кроки run для перевірки code interpreter:",
            e
          );
        }
      }
      console.log("🧪 Code Interpreter використано:", codeInterpreterUsed);

      // Отримуємо повідомлення з thread
      const messages = await azureOpenAI.beta.threads.messages.list(thread.id);
      console.log("🧪 Всього повідомлень у thread:", messages.data.length);
      for (const msg of messages.data) {
        const types = (msg.content || []).map((c: any) => c.type);
        const role = msg.role;
        console.log(`🧪 Повідомлення role=${role}, типи контенту:`, types);
      }

      // Підбираємо ТЕКСТ асистента: об'єднати всі текстові частини зі всіх повідомлень асистента
      const collectAssistantText = (): string => {
        const parts: string[] = [];
        for (const msg of messages.data) {
          if (msg.role !== "assistant") continue;
          const textParts = (msg.content || [])
            .filter((c: any) => c.type === "text" && c.text)
            .map((c: any) =>
              typeof c.text === "string" ? c.text : c.text.value
            )
            .filter(Boolean);
          if (textParts.length) {
            parts.push(textParts.join("\n").trim());
          }
        }
        const combined = parts.join("\n\n").trim();
        console.log(combined);
        console.log("🧪 Зібраний текст асистента, довжина:", combined.length);
        return combined;
      };

      // Зібрати ВСІ зображення, повернуті як image_file, з усіх повідомлень асистента
      const collectImageFileIds = (): string[] => {
        const ids: string[] = [];
        for (const msg of messages.data) {
          if (msg.role !== "assistant") continue;
          for (const c of msg.content || []) {
            if (c.type === "image_file" && c.image_file?.file_id) {
              ids.push(c.image_file.file_id);
            }
          }
        }
        return ids;
      };

      // NEW: зібрати image_file ID із кроків run (outputs code_interpreter)
      const collectImageFileIdsFromSteps = (): string[] => {
        const ids: string[] = [];
        for (const step of runStepsData) {
          const details: any =
            (step as any).step_details || (step as any).details;
          const toolCalls: any[] = details?.tool_calls || [];
          for (const tc of toolCalls) {
            const type = tc.type || tc?.tool_call_type;
            if (type === "code_interpreter" || type === "code") {
              const outputs: any[] =
                tc.code_interpreter?.outputs || tc.outputs || [];
              for (const out of outputs || []) {
                // Спробуємо знайти різні варіанти структури
                const fileId =
                  out?.image?.file_id ||
                  out?.image_file?.file_id ||
                  out?.file?.file_id ||
                  out?.file_id ||
                  null;
                if (fileId) {
                  ids.push(String(fileId).replace(/^file-/, "file_"));
                }
              }
            }
          }
        }
        console.log("🧪 Зібрано image_file IDs із run steps:", ids);
        return ids;
      };

      // Допоміжна функція: завантажити image_file та перетворити в data URI
      const fetchImageDataUri = async (
        fileId: string
      ): Promise<string | null> => {
        try {
          const meta = await azureOpenAI.files.retrieve(fileId);
          const filename = (meta as any)?.filename || "";
          let mime = "image/png";
          const lower = filename.toLowerCase();
          if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
            mime = "image/jpeg";
          else if (lower.endsWith(".png")) mime = "image/png";
          else if (lower.endsWith(".gif")) mime = "image/gif";
          else if (lower.endsWith(".webp")) mime = "image/webp";

          const fileResp: any = await azureOpenAI.files.content(fileId);
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
            const dataUri = `data:${mime};base64,${base64}`;
            console.log("🖼️ Отримано зображення від асистента:", {
              fileId,
              filename,
              mime,
              size: (arrayBuffer as any).byteLength,
            });
            return dataUri;
          } else {
            console.warn(
              "⚠️ Не вдалося отримати байти з image_file відповіді:",
              { fileId }
            );
            return null;
          }
        } catch (e) {
          console.warn("⚠️ Не вдалося завантажити image_file контент:", e);
          return null;
        }
      };

      // Зібрати всі зображення саме з цього виконання та сформувати фінальний Markdown
      // Використовуємо текст Фази 1 (combinedAssistantText)
      const responseText = combinedAssistantText;
      const messageImageIds = collectImageFileIds();
      const stepImageIds = collectImageFileIdsFromSteps();
      const imageFileIds = Array.from(
        new Set([...messageImageIds, ...stepImageIds])
      );
      console.log(
        "🧪 Знайдено image_file IDs (повідомлення+кроки):",
        imageFileIds
      );

      const imagesDataUris = (
        await Promise.all(imageFileIds.map((id) => fetchImageDataUri(id)))
      ).filter(Boolean) as string[];

      // Додатково: отримаємо інформацію про кроки для діагностики успішного виконання
      try {
        const steps = await azureOpenAI.beta.threads.runs.steps.list(
          thread.id,
          run.id
        );
        console.log("📋 Run steps (completed):", {
          count: steps.data?.length ?? 0,
          statuses: (steps.data || []).map((s: any) => s.status),
        });
      } catch (e) {
        console.warn("⚠️ Не вдалося отримати кроки run для діагностики:", e);
      }

      // 1) Якщо є картинки — замінити fenced code blocks на картинки по порядку
      let finalMarkdown = responseText;
      if (imagesDataUris.length > 0) {
        const codeBlockRegex = /```[\s\S]*?```/g;
        let imgIdx = 0;
        const replacedMarkdown = responseText.replace(codeBlockRegex, () => {
          const uri = imagesDataUris[imgIdx++];
          return uri ? `![diagram ${imgIdx}](${uri})` : ""; // якщо картинка закінчилась — просто прибираємо код
        });

        // 2) Якщо картинок більше ніж код-блоків — додати решту в кінці
        const remainingImages = imagesDataUris
          .slice(imgIdx)
          .map((uri, i) => `![diagram ${imgIdx + i + 1}](${uri})`);

        finalMarkdown = [replacedMarkdown, ...remainingImages]
          .filter(Boolean)
          .join("\n\n");
      }

      // 2) Конвертуємо Markdown → HTML для прямого використання
      const responseHtml = marked.parse(finalMarkdown);

      console.log(
        "✅ Фаза 1 завершена. Повертаю контент із картинками замість коду.",
        {
          threadId,
          runId,
          imagesFound: imageFileIds.length,
          imagesEmbedded: imagesDataUris.length,
          elapsedMs: Date.now() - startedAt,
        }
      );

      return NextResponse.json(
        {
          success: true,
          response: finalMarkdown,
          responseHtml,
        },
        {
          status: 200,
          headers: {
            "X-Run-Status": "completed",
            "X-Thread-Id": threadId || "",
            "X-Run-Id": runId || "",
            "X-Attempts": String(attempts),
            "X-Elapsed-Ms": String(Date.now() - startedAt),
            "X-Image-Ids-Count": String(imageFileIds.length),
            "X-Images-Embedded-Count": String(imagesDataUris.length),
            "X-Response-Format": "markdown+html",
          },
        }
      );
    } else if (attempts >= maxAttempts) {
      console.error("⏱️ Таймаут виконання run", {
        status: runStatus.status,
        attempts,
        elapsedMs: Date.now() - startedAt,
        threadId,
        runId,
      });
      return NextResponse.json(
        { success: false, error: "Таймаут виконання запиту (120 секунд)" },
        {
          status: 408,
          headers: {
            "X-Run-Status": String(runStatus.status),
            "X-Thread-Id": threadId || "",
            "X-Run-Id": runId || "",
            "X-Attempts": String(attempts),
            "X-Elapsed-Ms": String(Date.now() - startedAt),
          },
        }
      );
    }

    // Неочікуваний статус (requires_action, cancelling, інше)
    console.error("❓ Неочікуваний статус run:", {
      status: runStatus.status,
      attempts,
      elapsedMs: Date.now() - startedAt,
      threadId,
      runId,
      last_error: runStatus.last_error,
      required_action: (runStatus as any).required_action || undefined,
    });

    return NextResponse.json(
      { success: false, error: "Неочікувана помилка при роботі з асистентом" },
      {
        status: 500,
        headers: {
          "X-Run-Status": String(runStatus.status),
          "X-Thread-Id": threadId || "",
          "X-Run-Id": runId || "",
          "X-Attempts": String(attempts),
          "X-Elapsed-Ms": String(Date.now() - startedAt),
        },
      }
    );
  } catch (error) {
    console.error("Помилка генерації тесту:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Невідома помилка",
      },
      {
        status: 500,
        headers: {
          "X-Stage": "POST/generate-test catch",
          "X-Thread-Id": "",
          "X-Run-Id": "",
          "X-Error-Message":
            error instanceof Error ? error.message : "Unknown error",
        },
      }
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
