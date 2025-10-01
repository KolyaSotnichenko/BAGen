import { NextRequest, NextResponse } from 'next/server'

// Типи для налаштувань
interface TestSettings {
  id: string
  level: 'ecba' | 'ccba' | 'cbap'
  customPrompt: string
  defaultQuestionCount: number
  language: string
  testType: 'basic' | 'detailed' | 'babok' | 'practical'
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  includeExplanations: boolean
  knowledgeAreas: string[]
  timeLimit?: number
  createdAt: string
  updatedAt: string
}

interface SettingsRequest {
  level: 'ecba' | 'ccba' | 'cbap'
  customPrompt?: string
  defaultQuestionCount?: number
  language?: string
  testType?: 'basic' | 'detailed' | 'babok' | 'practical'
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
  includeExplanations?: boolean
  knowledgeAreas?: string[]
  timeLimit?: number
}

// Дефолтні налаштування для кожного рівня
const defaultSettings: Record<string, Omit<TestSettings, 'id' | 'createdAt' | 'updatedAt'>> = {
  ecba: {
    level: 'ecba',
    customPrompt: `Створи {{questions}} тестових питань для сертифікації ECBA (Entry Certificate in Business Analysis).
Зосередься на фундаментальних концепціях BA, базових техніках та вступних знаннях BABOK.
Питання повинні бути підходящими для початківців бізнес-аналітиків.
Відповідай українською мовою.`,
    defaultQuestionCount: 25,
    language: 'українська',
    testType: 'basic',
    difficulty: 'easy',
    includeExplanations: true,
    knowledgeAreas: [
      'Планування та моніторинг бізнес-аналізу',
      'Виявлення та співпраця',
      'Управління життєвим циклом вимог',
      'Стратегічний аналіз',
      'Аналіз вимог та визначення дизайну рішення',
      'Оцінка рішення'
    ],
    timeLimit: 30
  },
  ccba: {
    level: 'ccba',
    customPrompt: `Створи {{questions}} тестових питань для сертифікації CCBA (Certification of Capability in Business Analysis).
Включи питання середнього рівня складності, які покривають всі області знань BABOK, техніки та базові компетенції.
Питання повинні відображати досвід роботи 3-5 років у сфері BA.
Відповідай українською мовою.`,
    defaultQuestionCount: 50,
    language: 'українська',
    testType: 'detailed',
    difficulty: 'medium',
    includeExplanations: true,
    knowledgeAreas: [
      'Планування та моніторинг бізнес-аналізу',
      'Виявлення та співпраця',
      'Управління життєвим циклом вимог',
      'Стратегічний аналіз',
      'Аналіз вимог та визначення дизайну рішення',
      'Оцінка рішення'
    ],
    timeLimit: 60
  },
  cbap: {
    level: 'cbap',
    customPrompt: `Створи {{questions}} тестових питань для сертифікації CBAP (Certified Business Analysis Professional).
Створи складні питання, які вимагають глибокого розуміння BABOK, аналізу складних сценаріїв та стратегічного мислення.
Питання повинні бути підходящими для досвідчених бізнес-аналітиків з досвідом роботи 5+ років.
Відповідай українською мовою.`,
    defaultQuestionCount: 75,
    language: 'українська',
    testType: 'babok',
    difficulty: 'hard',
    includeExplanations: true,
    knowledgeAreas: [
      'Планування та моніторинг бізнес-аналізу',
      'Виявлення та співпраця',
      'Управління життєвим циклом вимог',
      'Стратегічний аналіз',
      'Аналіз вимог та визначення дизайну рішення',
      'Оцінка рішення'
    ],
    timeLimit: 90
  }
}

// Симуляція бази даних (в реальному проекті використовуйте справжню БД)
let settingsStorage: Record<string, TestSettings> = {}

// Ініціалізація дефолтних налаштувань
function initializeDefaultSettings() {
  Object.keys(defaultSettings).forEach(level => {
    const settingsId = `settings_${level}`
    if (!settingsStorage[settingsId]) {
      settingsStorage[settingsId] = {
        id: settingsId,
        ...defaultSettings[level],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  })
}

// GET - Отримання налаштувань
export async function GET(request: NextRequest) {
  try {
    initializeDefaultSettings()
    
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    
    if (level && ['ecba', 'ccba', 'cbap'].includes(level)) {
      const settingsId = `settings_${level}`
      const settings = settingsStorage[settingsId]
      
      if (settings) {
        return NextResponse.json({
          success: true,
          settings
        })
      } else {
        return NextResponse.json(
          { success: false, error: 'Налаштування не знайдені' },
          { status: 404 }
        )
      }
    }
    
    // Повернути всі налаштування
    return NextResponse.json({
      success: true,
      settings: Object.values(settingsStorage)
    })
    
  } catch (error) {
    console.error('Помилка отримання налаштувань:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}

// POST - Створення нових налаштувань
export async function POST(request: NextRequest) {
  try {
    const body: SettingsRequest = await request.json()
    
    // Валідація
    if (!body.level || !['ecba', 'ccba', 'cbap'].includes(body.level)) {
      return NextResponse.json(
        { success: false, error: 'Невірний рівень сертифікації' },
        { status: 400 }
      )
    }
    
    initializeDefaultSettings()
    
    const settingsId = `settings_${body.level}`
    const existingSettings = settingsStorage[settingsId] || defaultSettings[body.level]
    
    const newSettings: TestSettings = {
      id: settingsId,
      level: body.level,
      customPrompt: body.customPrompt || existingSettings.customPrompt,
      defaultQuestionCount: body.defaultQuestionCount || existingSettings.defaultQuestionCount,
      language: body.language || existingSettings.language,
      testType: body.testType || existingSettings.testType,
      difficulty: body.difficulty || existingSettings.difficulty,
      includeExplanations: body.includeExplanations !== undefined ? body.includeExplanations : existingSettings.includeExplanations,
      knowledgeAreas: body.knowledgeAreas || existingSettings.knowledgeAreas,
      timeLimit: body.timeLimit || existingSettings.timeLimit,
      createdAt: existingSettings.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    settingsStorage[settingsId] = newSettings
    
    return NextResponse.json({
      success: true,
      settings: newSettings
    })
    
  } catch (error) {
    console.error('Помилка створення налаштувань:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}

// PUT - Оновлення існуючих налаштувань
export async function PUT(request: NextRequest) {
  try {
    const body: SettingsRequest & { id?: string } = await request.json()
    
    if (!body.level || !['ecba', 'ccba', 'cbap'].includes(body.level)) {
      return NextResponse.json(
        { success: false, error: 'Невірний рівень сертифікації' },
        { status: 400 }
      )
    }
    
    initializeDefaultSettings()
    
    const settingsId = body.id || `settings_${body.level}`
    const existingSettings = settingsStorage[settingsId]
    
    if (!existingSettings) {
      return NextResponse.json(
        { success: false, error: 'Налаштування не знайдені' },
        { status: 404 }
      )
    }
    
    const updatedSettings: TestSettings = {
      ...existingSettings,
      customPrompt: body.customPrompt !== undefined ? body.customPrompt : existingSettings.customPrompt,
      defaultQuestionCount: body.defaultQuestionCount !== undefined ? body.defaultQuestionCount : existingSettings.defaultQuestionCount,
      language: body.language !== undefined ? body.language : existingSettings.language,
      testType: body.testType !== undefined ? body.testType : existingSettings.testType,
      difficulty: body.difficulty !== undefined ? body.difficulty : existingSettings.difficulty,
      includeExplanations: body.includeExplanations !== undefined ? body.includeExplanations : existingSettings.includeExplanations,
      knowledgeAreas: body.knowledgeAreas !== undefined ? body.knowledgeAreas : existingSettings.knowledgeAreas,
      timeLimit: body.timeLimit !== undefined ? body.timeLimit : existingSettings.timeLimit,
      updatedAt: new Date().toISOString()
    }
    
    settingsStorage[settingsId] = updatedSettings
    
    return NextResponse.json({
      success: true,
      settings: updatedSettings
    })
    
  } catch (error) {
    console.error('Помилка оновлення налаштувань:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}

// DELETE - Видалення налаштувань (скидання до дефолтних)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    
    if (!level || !['ecba', 'ccba', 'cbap'].includes(level)) {
      return NextResponse.json(
        { success: false, error: 'Невірний рівень сертифікації' },
        { status: 400 }
      )
    }
    
    const settingsId = `settings_${level}`
    
    // Скидання до дефолтних налаштувань
    settingsStorage[settingsId] = {
      id: settingsId,
      ...defaultSettings[level],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      message: 'Налаштування скинуті до дефолтних',
      settings: settingsStorage[settingsId]
    })
    
  } catch (error) {
    console.error('Помилка скидання налаштувань:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}