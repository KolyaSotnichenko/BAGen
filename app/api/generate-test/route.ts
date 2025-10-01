import { NextRequest, NextResponse } from 'next/server'
import { AzureOpenAI } from 'openai'

// Типи для запиту
interface GenerateTestRequest {
  level: 'ecba' | 'ccba' | 'cbap'
  questionCount: number
  language: string
  customPrompt?: string
  testType?: 'basic' | 'detailed' | 'babok' | 'practical'
  systemPrompt?: string // Системний промпт від користувача
}

interface TestQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  knowledgeArea?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface GenerateTestResponse {
  success: boolean
  questions?: TestQuestion[]
  error?: string
  metadata?: {
    level: string
    questionCount: number
    language: string
    generatedAt: string
    assistantId?: string
    threadId?: string
  }
}

// Ініціалізація Azure OpenAI клієнта
const azureOpenAI = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: '2024-05-01-preview', // Правильна версія для Assistants API
})

// ID асистента з .env файлу
const ASSISTANT_ID = process.env.AZURE_OPENAI_ASSISTANT_ID

// Системні промпти за замовчуванням для різних рівнів
const defaultSystemPrompts = {
  ecba: `Створи {{questions}} тестових питань для сертифікації ECBA (Entry Certificate in Business Analysis).
Зосередься на фундаментальних концепціях BA, базових техніках та вступних знаннях BABOK.
Питання повинні бути підходящими для початківців бізнес-аналітиків.
Відповідай {{language}} мовою.`,
  ccba: `Створи {{questions}} тестових питань для сертифікації CCBA (Certification of Capability in Business Analysis).
Включи питання середнього рівня складності, які покривають всі області знань BABOK, техніки та базові компетенції.
Питання повинні відображати досвід роботи 3-5 років у сфері BA.
Відповідай {{language}} мовою.`,
  cbap: `Створи {{questions}} тестових питань для сертифікації CBAP (Certified Business Analysis Professional).
Створи складні питання, які вимагають глибокого розуміння BABOK, аналізу складних сценаріїв та стратегічного мислення.
Питання повинні бути підходящими для досвідчених бізнес-аналітиків з досвідом роботи 5+ років.
Відповідай {{language}} мовою.`
}

// Промпти для різних типів тестів
const testTypePrompts = {
  basic: `Створи {{questions}} питань для сертифікації {{level}}.
Зроби питання зрозумілими та релевантними для рівня сертифікації.
Відповідай {{language}} мовою.`,

  detailed: `Створи {{questions}} комплексних тестових питань для сертифікації {{level}}.
Включи:
- Питання з множинним вибором з 4 варіантами відповідей
- Питання на основі сценаріїв
- Покриття областей знань BABOK
- Різні рівні складності, відповідні для {{level}}
Надай правильні відповіді з поясненнями.
Відповідай {{language}} мовою.`,

  babok: `Створи {{questions}} питань, узгоджених з BABOK v3, для сертифікації {{level}}.
Покрий всі 6 областей знань:
1. Планування та моніторинг бізнес-аналізу
2. Виявлення та співпраця
3. Управління життєвим циклом вимог
4. Стратегічний аналіз
5. Аналіз вимог та визначення дизайну рішення
6. Оцінка рішення
Включи техніки та базові компетенції.
Відповідай {{language}} мовою.`,

  practical: `Створи {{questions}} практичних екзаменаційних питань для сертифікації {{level}}.
Зосередься на реальних сценаріях та практичному застосуванні концепцій BA.
Включи питання на ситуаційне судження та кейс-стаді.
Формат: Множинний вибір з поясненнями для правильних відповідей.
Відповідай {{language}} мовою.`
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateTestRequest = await request.json()
    
    // Валідація вхідних даних
    if (!body.level || !['ecba', 'ccba', 'cbap'].includes(body.level)) {
      return NextResponse.json(
        { success: false, error: 'Невірний рівень сертифікації' },
        { status: 400 }
      )
    }
    
    if (!body.questionCount || body.questionCount < 1 || body.questionCount > 200) {
      return NextResponse.json(
        { success: false, error: 'Кількість питань повинна бути від 1 до 200' },
        { status: 400 }
      )
    }
    
    if (!body.language) {
      return NextResponse.json(
        { success: false, error: 'Мова не вказана' },
        { status: 400 }
      )
    }

    if (!ASSISTANT_ID) {
      return NextResponse.json(
        { success: false, error: 'ID асистента не налаштований' },
        { status: 500 }
      )
    }

    // Визначаємо системний промпт (користувацький або за замовчуванням)
    const systemPrompt = body.systemPrompt || defaultSystemPrompts[body.level]
    
    // Формування промпту
    const testType = body.testType || 'basic'
    let userPrompt = body.customPrompt || testTypePrompts[testType]
    
    // Заміна плейсхолдерів
    userPrompt = userPrompt
      .replace(/\{\{questions\}\}/g, body.questionCount.toString())
      .replace(/\{\{level\}\}/g, body.level.toUpperCase())
      .replace(/\{\{language\}\}/g, body.language)
    
    // Додаємо інструкції для форматування відповіді
    const formatInstructions = `

Відповідь надай у форматі JSON з наступною структурою:
{
  "questions": [
    {
      "id": 1,
      "question": "Текст питання",
      "options": ["Варіант A", "Варіант B", "Варіант C", "Варіант D"],
      "correctAnswer": 0,
      "explanation": "Пояснення правильної відповіді",
      "knowledgeArea": "Область знань BABOK",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Мова відповіді: ${body.language}
Переконайся, що всі питання та варіанти відповідей написані мовою: ${body.language}`

    const fullPrompt = `${systemPrompt}

${userPrompt}${formatInstructions}`

    // Створюємо thread
    const thread = await azureOpenAI.beta.threads.create()
    
    // Додаємо повідомлення до thread
    await azureOpenAI.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: fullPrompt
    })
    
    // Запускаємо асистента
    const run = await azureOpenAI.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    })
    
    // Очікуємо завершення виконання
    let runStatus = await azureOpenAI.beta.threads.runs.retrieve(thread.id, run.id)
    
    // Polling для очікування завершення (максимум 120 секунд)
    let attempts = 0
    const maxAttempts = 120
    
    while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await azureOpenAI.beta.threads.runs.retrieve(thread.id, run.id)
      attempts++
    }
    
    if (runStatus.status === 'completed') {
      // Отримуємо повідомлення з thread
      const messages = await azureOpenAI.beta.threads.messages.list(thread.id)
      const lastMessage = messages.data[0]
      
      if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
        const responseText = lastMessage.content[0].text.value
        
        try {
          // Парсимо JSON відповідь
          let parsedResponse
          try {
            parsedResponse = JSON.parse(responseText)
          } catch (parseError) {
            // Якщо JSON не валідний, спробуємо витягти JSON з тексту
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              parsedResponse = JSON.parse(jsonMatch[0])
            } else {
              throw new Error('Не вдалося розпарсити відповідь як JSON')
            }
          }
          
          const response: GenerateTestResponse = {
            success: true,
            questions: parsedResponse.questions,
            metadata: {
              level: body.level,
              questionCount: body.questionCount,
              language: body.language,
              generatedAt: new Date().toISOString(),
              assistantId: ASSISTANT_ID,
              threadId: thread.id
            }
          }
          
          return NextResponse.json(response)
        } catch (parseError) {
          console.error('Помилка парсингу JSON:', parseError)
          return NextResponse.json(
            { success: false, error: 'Помилка обробки відповіді асистента' },
            { status: 500 }
          )
        }
      }
    } else if (runStatus.status === 'failed') {
      console.error('Асистент не зміг виконати запит:', runStatus.last_error)
      return NextResponse.json(
        { success: false, error: `Асистент не зміг згенерувати тест: ${runStatus.last_error?.message || 'Невідома помилка'}` },
        { status: 500 }
      )
    } else if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: 'Таймаут виконання запиту (120 секунд)' },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Неочікувана помилка при роботі з асистентом' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Помилка генерації тесту:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API для генерації тестів працює з Azure Assistants API',
    endpoints: {
      POST: '/api/generate-test - Генерація тестових питань',
      GET: '/api/generate-test - Інформація про API'
    },
    supportedLevels: ['ecba', 'ccba', 'cbap'],
    supportedTestTypes: ['basic', 'detailed', 'babok', 'practical'],
    features: [
      'Підтримка системних промптів від користувача',
      'Azure Assistants API інтеграція',
      'Автоматичне управління threads та runs',
      'Розширений таймаут (120 секунд)'
    ],
    assistantId: ASSISTANT_ID || 'не налаштований'
  })
}