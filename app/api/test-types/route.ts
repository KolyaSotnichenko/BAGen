import { NextRequest, NextResponse } from 'next/server'

// Типи для тестових шаблонів
interface TestTemplate {
  id: string
  name: string
  description: string
  prompt: string
  level: 'ecba' | 'ccba' | 'cbap' | 'all'
  category: 'basic' | 'detailed' | 'babok' | 'practical' | 'custom'
  tags: string[]
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  estimatedTime: number // в хвилинах
  createdAt: string
  updatedAt: string
}

interface TestTypeRequest {
  name?: string
  description?: string
  prompt?: string
  level?: 'ecba' | 'ccba' | 'cbap' | 'all'
  category?: 'basic' | 'detailed' | 'babok' | 'practical' | 'custom'
  tags?: string[]
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
  estimatedTime?: number
}

// Предвизначені шаблони тестів
const defaultTemplates: TestTemplate[] = [
  {
    id: 'basic_general',
    name: 'Базовий тест',
    description: 'Загальні питання для перевірки базових знань',
    prompt: `Створи {{questions}} питань для сертифікації {{level}}.
Зроби питання зрозумілими та релевантними для рівня сертифікації.
Мова: {{language}}`,
    level: 'all',
    category: 'basic',
    tags: ['загальні', 'базові', 'основи'],
    difficulty: 'easy',
    estimatedTime: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'detailed_comprehensive',
    name: 'Детальний тест',
    description: 'Комплексні питання з поясненнями та сценаріями',
    prompt: `Створи {{questions}} комплексних тестових питань для сертифікації {{level}}.
Включи:
- Питання з множинним вибором з 4 варіантами відповідей
- Питання на основі сценаріїв
- Покриття областей знань BABOK
- Різні рівні складності, відповідні для {{level}}
Надай правильні відповіді з поясненнями.
Мова: {{language}}`,
    level: 'all',
    category: 'detailed',
    tags: ['детальні', 'сценарії', 'пояснення'],
    difficulty: 'medium',
    estimatedTime: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'babok_focused',
    name: 'BABOK-орієнтований тест',
    description: 'Питання, узгоджені з BABOK v3 та всіма областями знань',
    prompt: `Створи {{questions}} питань, узгоджених з BABOK v3, для сертифікації {{level}}.
Покрий всі 6 областей знань:
1. Планування та моніторинг бізнес-аналізу
2. Виявлення та співпраця
3. Управління життєвим циклом вимог
4. Стратегічний аналіз
5. Аналіз вимог та визначення дизайну рішення
6. Оцінка рішення
Включи техніки та базові компетенції.
Мова: {{language}}`,
    level: 'all',
    category: 'babok',
    tags: ['BABOK', 'області знань', 'техніки', 'компетенції'],
    difficulty: 'hard',
    estimatedTime: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'practical_scenarios',
    name: 'Практичні сценарії',
    description: 'Реальні робочі ситуації та кейс-стаді',
    prompt: `Створи {{questions}} практичних екзаменаційних питань для сертифікації {{level}}.
Зосередься на реальних сценаріях та практичному застосуванні концепцій BA.
Включи питання на ситуаційне судження та кейс-стаді.
Формат: Множинний вибір з поясненнями для правильних відповідей.
Мова: {{language}}`,
    level: 'all',
    category: 'practical',
    tags: ['практичні', 'сценарії', 'кейс-стаді', 'реальні ситуації'],
    difficulty: 'medium',
    estimatedTime: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ecba_entry_level',
    name: 'ECBA Початковий рівень',
    description: 'Спеціально для початківців бізнес-аналітиків',
    prompt: `Створи {{questions}} питань для сертифікації ECBA (Entry Certificate in Business Analysis).
Зосередься на:
- Основних концепціях бізнес-аналізу
- Базових техніках виявлення вимог
- Простих сценаріях з реального життя
- Термінології BABOK для початківців
Питання повинні бути зрозумілими для людей без досвіду в BA.
Мова: {{language}}`,
    level: 'ecba',
    category: 'basic',
    tags: ['ECBA', 'початківці', 'основи', 'термінологія'],
    difficulty: 'easy',
    estimatedTime: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ccba_intermediate',
    name: 'CCBA Середній рівень',
    description: 'Для бізнес-аналітиків з досвідом 3-5 років',
    prompt: `Створи {{questions}} питань для сертифікації CCBA (Certification of Capability in Business Analysis).
Включи:
- Питання середньої складності з усіх областей BABOK
- Сценарії, що вимагають аналітичного мислення
- Техніки управління стейкхолдерами
- Методи документування вимог
- Практичні ситуації з проектного досвіду
Мова: {{language}}`,
    level: 'ccba',
    category: 'detailed',
    tags: ['CCBA', 'середній рівень', 'досвід', 'стейкхолдери'],
    difficulty: 'medium',
    estimatedTime: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cbap_advanced',
    name: 'CBAP Експертний рівень',
    description: 'Для досвідчених бізнес-аналітиків та лідерів',
    prompt: `Створи {{questions}} питань для сертифікації CBAP (Certified Business Analysis Professional).
Зосередься на:
- Стратегічному мисленні та плануванні
- Складних сценаріях прийняття рішень
- Лідерстві в бізнес-аналізі
- Управлінні змінами та трансформаціями
- Інноваційних підходах до BA
- Міжфункціональній співпраці
Питання повинні відображати експертний рівень знань.
Мова: {{language}}`,
    level: 'cbap',
    category: 'babok',
    tags: ['CBAP', 'експертний', 'стратегія', 'лідерство'],
    difficulty: 'hard',
    estimatedTime: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Симуляція бази даних
let templatesStorage: Record<string, TestTemplate> = {}

// Ініціалізація дефолтних шаблонів
function initializeDefaultTemplates() {
  defaultTemplates.forEach(template => {
    if (!templatesStorage[template.id]) {
      templatesStorage[template.id] = template
    }
  })
}

// GET - Отримання типів тестів
export async function GET(request: NextRequest) {
  try {
    initializeDefaultTemplates()
    
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const id = searchParams.get('id')
    
    // Отримання конкретного шаблону
    if (id) {
      const template = templatesStorage[id]
      if (template) {
        return NextResponse.json({
          success: true,
          template
        })
      } else {
        return NextResponse.json(
          { success: false, error: 'Шаблон не знайдено' },
          { status: 404 }
        )
      }
    }
    
    // Фільтрація шаблонів
    let templates = Object.values(templatesStorage)
    
    if (level && level !== 'all') {
      templates = templates.filter(t => t.level === level || t.level === 'all')
    }
    
    if (category) {
      templates = templates.filter(t => t.category === category)
    }
    
    if (difficulty) {
      templates = templates.filter(t => t.difficulty === difficulty || t.difficulty === 'mixed')
    }
    
    return NextResponse.json({
      success: true,
      templates,
      total: templates.length
    })
    
  } catch (error) {
    console.error('Помилка отримання типів тестів:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}

// POST - Створення нового типу тесту
export async function POST(request: NextRequest) {
  try {
    const body: TestTypeRequest & { id?: string } = await request.json()
    
    // Валідація
    if (!body.name || !body.prompt) {
      return NextResponse.json(
        { success: false, error: 'Назва та промпт є обов\'язковими' },
        { status: 400 }
      )
    }
    
    initializeDefaultTemplates()
    
    const templateId = body.id || `custom_${Date.now()}`
    
    const newTemplate: TestTemplate = {
      id: templateId,
      name: body.name,
      description: body.description || '',
      prompt: body.prompt,
      level: body.level || 'all',
      category: body.category || 'custom',
      tags: body.tags || [],
      difficulty: body.difficulty || 'medium',
      estimatedTime: body.estimatedTime || 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    templatesStorage[templateId] = newTemplate
    
    return NextResponse.json({
      success: true,
      template: newTemplate
    })
    
  } catch (error) {
    console.error('Помилка створення типу тесту:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}

// PUT - Оновлення існуючого типу тесту
export async function PUT(request: NextRequest) {
  try {
    const body: TestTypeRequest & { id: string } = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID шаблону є обов\'язковим' },
        { status: 400 }
      )
    }
    
    initializeDefaultTemplates()
    
    const existingTemplate = templatesStorage[body.id]
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Шаблон не знайдено' },
        { status: 404 }
      )
    }
    
    const updatedTemplate: TestTemplate = {
      ...existingTemplate,
      name: body.name !== undefined ? body.name : existingTemplate.name,
      description: body.description !== undefined ? body.description : existingTemplate.description,
      prompt: body.prompt !== undefined ? body.prompt : existingTemplate.prompt,
      level: body.level !== undefined ? body.level : existingTemplate.level,
      category: body.category !== undefined ? body.category : existingTemplate.category,
      tags: body.tags !== undefined ? body.tags : existingTemplate.tags,
      difficulty: body.difficulty !== undefined ? body.difficulty : existingTemplate.difficulty,
      estimatedTime: body.estimatedTime !== undefined ? body.estimatedTime : existingTemplate.estimatedTime,
      updatedAt: new Date().toISOString()
    }
    
    templatesStorage[body.id] = updatedTemplate
    
    return NextResponse.json({
      success: true,
      template: updatedTemplate
    })
    
  } catch (error) {
    console.error('Помилка оновлення типу тесту:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}

// DELETE - Видалення типу тесту
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID шаблону є обов\'язковим' },
        { status: 400 }
      )
    }
    
    initializeDefaultTemplates()
    
    const template = templatesStorage[id]
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Шаблон не знайдено' },
        { status: 404 }
      )
    }
    
    // Не дозволяємо видаляти дефолтні шаблони
    const isDefaultTemplate = defaultTemplates.some(t => t.id === id)
    if (isDefaultTemplate) {
      return NextResponse.json(
        { success: false, error: 'Неможливо видалити системний шаблон' },
        { status: 403 }
      )
    }
    
    delete templatesStorage[id]
    
    return NextResponse.json({
      success: true,
      message: 'Шаблон успішно видалено'
    })
    
  } catch (error) {
    console.error('Помилка видалення типу тесту:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: 500 }
    )
  }
}