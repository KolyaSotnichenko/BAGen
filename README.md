# BAGen - Business Analyst Test Generator

Система генерації тестів для бізнес-аналітиків з використанням Azure OpenAI Assistant.

## Особливості

- 🎯 **3 рівні сертифікації**: ECBA, CCBA, CBAP
- 🤖 **Azure OpenAI інтеграція**: Використання GPT-4 для генерації якісних питань
- 🎨 **Сучасний UI**: Побудований на Next.js 14 та Tailwind CSS
- ⚙️ **Гнучкі налаштування**: Кастомні промпти та параметри для кожного рівня
- 🌐 **Багатомовність**: Підтримка української, англійської та російської мов
- 📊 **Різні типи тестів**: Базові, детальні, BABOK-орієнтовані та практичні

## Технології

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **AI**: Azure OpenAI (GPT-4)
- **API**: Next.js API Routes
- **Валідація**: Zod
- **Форми**: React Hook Form

## Швидкий старт

### 1. Клонування репозиторію

```bash
git clone <repository-url>
cd BAGen
```

### 2. Встановлення залежностей

```bash
npm install
# або
pnpm install
```

### 3. Налаштування змінних середовища

Скопіюйте `.env.example` в `.env.local` та заповніть необхідні значення:

```bash
cp .env.example .env.local
```

Заповніть наступні змінні:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 4. Запуск проекту

```bash
npm run dev
# або
pnpm dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

## API Документація

### Генерація тестів

#### POST `/api/generate-test`

Генерує тестові питання для вказаного рівня сертифікації.

**Запит:**
```json
{
  "level": "ecba" | "ccba" | "cbap",
  "questionCount": 25,
  "language": "українська" | "english" | "русский",
  "testType": "basic" | "detailed" | "babok" | "practical",
  "customPrompt": "Опціональний кастомний промпт"
}
```

**Відповідь:**
```json
{
  "success": true,
  "questions": [
    {
      "id": 1,
      "question": "Текст питання",
      "options": ["Варіант A", "Варіант B", "Варіант C", "Варіант D"],
      "correctAnswer": 0,
      "explanation": "Пояснення правильної відповіді",
      "knowledgeArea": "Область знань BABOK",
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "metadata": {
    "level": "ecba",
    "questionCount": 25,
    "language": "українська",
    "generatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Налаштування

#### GET `/api/settings`

Отримує налаштування для всіх рівнів або конкретного рівня.

**Параметри запиту:**
- `level` (опціонально): `ecba` | `ccba` | `cbap`

#### POST `/api/settings`

Створює або оновлює налаштування для рівня.

**Запит:**
```json
{
  "level": "ecba",
  "customPrompt": "Кастомний промпт",
  "defaultQuestionCount": 25,
  "language": "українська",
  "testType": "basic",
  "difficulty": "easy",
  "includeExplanations": true,
  "knowledgeAreas": ["Планування та моніторинг бізнес-аналізу"],
  "timeLimit": 30
}
```

#### PUT `/api/settings`

Оновлює існуючі налаштування.

#### DELETE `/api/settings?level=ecba`

Скидає налаштування до дефолтних значень.

### Типи тестів

#### GET `/api/test-types`

Отримує доступні шаблони тестів.

**Параметри запиту:**
- `level`: `ecba` | `ccba` | `cbap` | `all`
- `category`: `basic` | `detailed` | `babok` | `practical`
- `difficulty`: `easy` | `medium` | `hard` | `mixed`
- `id`: ID конкретного шаблону

#### POST `/api/test-types`

Створює новий шаблон тесту.

#### PUT `/api/test-types`

Оновлює існуючий шаблон.

#### DELETE `/api/test-types?id=template_id`

Видаляє кастомний шаблон (системні шаблони видалити неможливо).

## Структура проекту

```
BAGen/
├── app/
│   ├── api/                    # API routes
│   │   ├── generate-test/      # Генерація тестів
│   │   ├── settings/           # Налаштування
│   │   └── test-types/         # Типи тестів
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                 # React компоненти
│   ├── ui/                     # UI компоненти (Radix UI)
│   ├── level-card.tsx
│   ├── progress-bar.tsx
│   ├── prompt-modal.tsx
│   └── stats-display.tsx
├── lib/
│   ├── api-client.ts          # Клієнт для API
│   └── utils.ts
├── types/
│   └── api.ts                 # TypeScript типи
├── hooks/                     # React хуки
├── public/                    # Статичні файли
└── styles/                    # Стилі
```

## Рівні сертифікації

### ECBA (Entry Certificate in Business Analysis)
- **Цільова аудиторія**: Початківці в бізнес-аналізі
- **Максимум питань**: 100
- **Складність**: Легка
- **Фокус**: Основні концепції, базові техніки

### CCBA (Certification of Capability in Business Analysis)
- **Цільова аудиторія**: Досвідчені аналітики (3-5 років)
- **Максимум питань**: 150
- **Складність**: Середня
- **Фокус**: Всі області BABOK, техніки, компетенції

### CBAP (Certified Business Analysis Professional)
- **Цільова аудиторія**: Експерти (5+ років досвіду)
- **Максимум питань**: 200
- **Складність**: Висока
- **Фокус**: Стратегічне мислення, складні сценарії

## Типи тестів

1. **Базовий** - Загальні питання для перевірки основних знань
2. **Детальний** - Комплексні питання з поясненнями та сценаріями
3. **BABOK-орієнтований** - Питання, узгоджені з BABOK v3
4. **Практичний** - Реальні робочі ситуації та кейс-стаді

## Області знань BABOK v3

1. Планування та моніторинг бізнес-аналізу
2. Виявлення та співпраця
3. Управління життєвим циклом вимог
4. Стратегічний аналіз
5. Аналіз вимог та визначення дизайну рішення
6. Оцінка рішення

## Розробка

### Додавання нових функцій

1. Створіть нову гілку: `git checkout -b feature/new-feature`
2. Внесіть зміни
3. Додайте тести (якщо необхідно)
4. Зробіть коміт: `git commit -m 'Add new feature'`
5. Відправте зміни: `git push origin feature/new-feature`
6. Створіть Pull Request

### Налаштування Azure OpenAI

1. Створіть ресурс Azure OpenAI в Azure Portal
2. Розгорніть модель GPT-4
3. Отримайте API ключ та endpoint
4. Налаштуйте змінні середовища

### Локальна розробка

```bash
# Встановлення залежностей
pnpm install

# Запуск в режимі розробки
pnpm dev

# Збірка для продакшену
pnpm build

# Запуск продакшен версії
pnpm start

# Лінтинг
pnpm lint
```

## Ліцензія

MIT License - дивіться файл [LICENSE](LICENSE) для деталей.

## Підтримка

Якщо у вас виникли питання або проблеми, створіть issue в репозиторії або зв'яжіться з командою розробки.