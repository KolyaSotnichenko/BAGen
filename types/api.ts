// Типи для API запитів та відповідей

// Базові типи
export type CertificationLevel = 'ecba' | 'ccba' | 'cbap'
export type TestType = 'basic' | 'detailed' | 'babok' | 'practical'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed'
export type Language = 'українська' | 'english' | 'русский'

// Типи для тестових питань
export interface TestQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  knowledgeArea?: string
  difficulty: Difficulty
}

// API для генерації тестів
export interface GenerateTestRequest {
  level: CertificationLevel
  questionCount: number
  language: Language
  customPrompt?: string
  testType?: TestType
}

export interface GenerateTestResponse {
  success: boolean
  questions?: TestQuestion[]
  error?: string
  metadata?: {
    level: string
    questionCount: number
    language: string
    generatedAt: string
  }
}

// API для налаштувань
export interface TestSettings {
  id: string
  level: CertificationLevel
  customPrompt: string
  defaultQuestionCount: number
  language: Language
  testType: TestType
  difficulty: Difficulty
  includeExplanations: boolean
  knowledgeAreas: string[]
  timeLimit?: number
  createdAt: string
  updatedAt: string
}

export interface SettingsRequest {
  level: CertificationLevel
  customPrompt?: string
  defaultQuestionCount?: number
  language?: Language
  testType?: TestType
  difficulty?: Difficulty
  includeExplanations?: boolean
  knowledgeAreas?: string[]
  timeLimit?: number
}

export interface SettingsResponse {
  success: boolean
  settings?: TestSettings
  error?: string
}

// API для типів тестів
export interface TestTemplate {
  id: string
  name: string
  description: string
  prompt: string
  level: CertificationLevel | 'all'
  category: TestType | 'custom'
  tags: string[]
  difficulty: Difficulty
  estimatedTime: number // в хвилинах
  createdAt: string
  updatedAt: string
}

export interface TestTypeRequest {
  name?: string
  description?: string
  prompt?: string
  level?: CertificationLevel | 'all'
  category?: TestType | 'custom'
  tags?: string[]
  difficulty?: Difficulty
  estimatedTime?: number
}

export interface TestTypesResponse {
  success: boolean
  templates?: TestTemplate[]
  template?: TestTemplate
  total?: number
  error?: string
}

// Загальні типи для API відповідей
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Типи для помилок
export interface ApiError {
  code: string
  message: string
  details?: any
}

// Типи для пагінації
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: string
}

// Типи для фільтрації
export interface FilterParams {
  level?: CertificationLevel
  difficulty?: Difficulty
  testType?: TestType
  language?: Language
  tags?: string[]
}

// Константи для валідації
export const VALIDATION_LIMITS = {
  MIN_QUESTIONS: 1,
  MAX_QUESTIONS: 200,
  MIN_TIME_LIMIT: 5, // хвилин
  MAX_TIME_LIMIT: 180, // хвилин
  MAX_PROMPT_LENGTH: 5000,
  MAX_TEMPLATE_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500
} as const

// Константи для областей знань BABOK
export const BABOK_KNOWLEDGE_AREAS = [
  'Планування та моніторинг бізнес-аналізу',
  'Виявлення та співпраця',
  'Управління життєвим циклом вимог',
  'Стратегічний аналіз',
  'Аналіз вимог та визначення дизайну рішення',
  'Оцінка рішення'
] as const

// Константи для рівнів сертифікації
export const CERTIFICATION_LEVELS = {
  ecba: {
    name: 'ECBA',
    fullName: 'Entry Certificate in Business Analysis',
    maxQuestions: 100,
    description: 'Початковий рівень для новачків у бізнес-аналізі'
  },
  ccba: {
    name: 'CCBA',
    fullName: 'Certification of Capability in Business Analysis',
    maxQuestions: 150,
    description: 'Середній рівень для досвідчених аналітиків'
  },
  cbap: {
    name: 'CBAP',
    fullName: 'Certified Business Analysis Professional',
    maxQuestions: 200,
    description: 'Експертний рівень для професіоналів'
  }
} as const

// Типи для статистики
export interface TestStatistics {
  totalGenerated: number
  byLevel: Record<CertificationLevel, number>
  byType: Record<TestType, number>
  byLanguage: Record<Language, number>
  averageQuestions: number
  lastGenerated?: string
}

// Типи для історії генерації
export interface GenerationHistory {
  id: string
  level: CertificationLevel
  questionCount: number
  testType: TestType
  language: Language
  generatedAt: string
  duration: number // в секундах
  success: boolean
  error?: string
}

export interface HistoryResponse {
  success: boolean
  history?: GenerationHistory[]
  statistics?: TestStatistics
  error?: string
}