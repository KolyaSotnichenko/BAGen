// Клієнт для роботи з API на фронтенді

import type {
  GenerateTestRequest,
  GenerateTestResponse,
  SettingsRequest,
  SettingsResponse,
  TestSettings,
  TestTypeRequest,
  TestTypesResponse,
  TestTemplate,
  CertificationLevel,
  TestType,
  Difficulty
} from '@/types/api'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Методи для генерації тестів
  async generateTest(request: GenerateTestRequest): Promise<GenerateTestResponse> {
    return this.request<GenerateTestResponse>('/generate-test', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Методи для налаштувань
  async getSettings(level?: CertificationLevel): Promise<SettingsResponse> {
    const params = level ? `?level=${level}` : ''
    return this.request<SettingsResponse>(`/settings${params}`)
  }

  async getAllSettings(): Promise<{ success: boolean; settings: TestSettings[]; error?: string }> {
    return this.request<{ success: boolean; settings: TestSettings[]; error?: string }>('/settings')
  }

  async createSettings(request: SettingsRequest): Promise<SettingsResponse> {
    return this.request<SettingsResponse>('/settings', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async updateSettings(request: SettingsRequest & { id?: string }): Promise<SettingsResponse> {
    return this.request<SettingsResponse>('/settings', {
      method: 'PUT',
      body: JSON.stringify(request),
    })
  }

  async resetSettings(level: CertificationLevel): Promise<SettingsResponse> {
    return this.request<SettingsResponse>(`/settings?level=${level}`, {
      method: 'DELETE',
    })
  }

  // Методи для типів тестів
  async getTestTypes(filters?: {
    level?: CertificationLevel | 'all'
    category?: TestType
    difficulty?: Difficulty
  }): Promise<TestTypesResponse> {
    const params = new URLSearchParams()
    if (filters?.level) params.append('level', filters.level)
    if (filters?.category) params.append('category', filters.category)
    if (filters?.difficulty) params.append('difficulty', filters.difficulty)
    
    const queryString = params.toString()
    return this.request<TestTypesResponse>(`/test-types${queryString ? `?${queryString}` : ''}`)
  }

  async getTestType(id: string): Promise<TestTypesResponse> {
    return this.request<TestTypesResponse>(`/test-types?id=${id}`)
  }

  async createTestType(request: TestTypeRequest & { id?: string }): Promise<TestTypesResponse> {
    return this.request<TestTypesResponse>('/test-types', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async updateTestType(request: TestTypeRequest & { id: string }): Promise<TestTypesResponse> {
    return this.request<TestTypesResponse>('/test-types', {
      method: 'PUT',
      body: JSON.stringify(request),
    })
  }

  async deleteTestType(id: string): Promise<TestTypesResponse> {
    return this.request<TestTypesResponse>(`/test-types?id=${id}`, {
      method: 'DELETE',
    })
  }

  // Утилітарні методи
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health')
  }
}

// Створюємо єдиний екземпляр клієнта
export const apiClient = new ApiClient()

// Хуки для використання в React компонентах
export const useApiClient = () => {
  return apiClient
}

// Утилітарні функції для обробки помилок
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Сталася невідома помилка'
}

// Функції для валідації запитів
export const validateGenerateTestRequest = (request: GenerateTestRequest): string[] => {
  const errors: string[] = []

  if (!request.level || !['ecba', 'ccba', 'cbap'].includes(request.level)) {
    errors.push('Невірний рівень сертифікації')
  }

  if (!request.questionCount || request.questionCount < 1 || request.questionCount > 200) {
    errors.push('Кількість питань повинна бути від 1 до 200')
  }

  if (!request.language) {
    errors.push('Мова є обов\'язковою')
  }

  if (request.customPrompt && request.customPrompt.length > 5000) {
    errors.push('Промпт занадто довгий (максимум 5000 символів)')
  }

  return errors
}

export const validateSettingsRequest = (request: SettingsRequest): string[] => {
  const errors: string[] = []

  if (!request.level || !['ecba', 'ccba', 'cbap'].includes(request.level)) {
    errors.push('Невірний рівень сертифікації')
  }

  if (request.defaultQuestionCount && (request.defaultQuestionCount < 1 || request.defaultQuestionCount > 200)) {
    errors.push('Кількість питань за замовчуванням повинна бути від 1 до 200')
  }

  if (request.timeLimit && (request.timeLimit < 5 || request.timeLimit > 180)) {
    errors.push('Ліміт часу повинен бути від 5 до 180 хвилин')
  }

  if (request.customPrompt && request.customPrompt.length > 5000) {
    errors.push('Промпт занадто довгий (максимум 5000 символів)')
  }

  return errors
}

// Функції для форматування даних
export const formatTestQuestion = (question: any, index: number) => {
  return {
    id: index + 1,
    question: question.question || '',
    options: Array.isArray(question.options) ? question.options : [],
    correctAnswer: typeof question.correctAnswer === 'number' ? question.correctAnswer : 0,
    explanation: question.explanation || '',
    knowledgeArea: question.knowledgeArea || '',
    difficulty: question.difficulty || 'medium'
  }
}

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} сек`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) {
    return `${minutes} хв`
  }
  return `${minutes} хв ${remainingSeconds} сек`
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}