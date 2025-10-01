"use client"

import { useState } from "react"
import { LevelCard } from "@/components/level-card"
import { ProgressBar } from "@/components/progress-bar"
import { PromptModal } from "@/components/prompt-modal"
import { StatsDisplay } from "@/components/stats-display"

export type CertificationLevel = "ecba" | "ccba" | "cbap"

export interface LevelConfig {
  id: CertificationLevel
  name: string
  description: string
  maxQuestions: number
}

const levels: LevelConfig[] = [
  {
    id: "ecba",
    name: "ECBA",
    description: "Entry Certificate in Business Analysis",
    maxQuestions: 100,
  },
  {
    id: "ccba",
    name: "CCBA",
    description: "Certification of Capability in Business Analysis",
    maxQuestions: 150,
  },
  {
    id: "cbap",
    name: "CBAP",
    description: "Certified Business Analysis Professional",
    maxQuestions: 200,
  },
]

const defaultPrompts: Record<CertificationLevel, string> = {
  ecba: `Створи {{questions}} тестових питань для сертифікації ECBA (Entry Certificate in Business Analysis).
Зосередься на фундаментальних концепціях бізнес-аналізу, базових техніках та вступних знаннях BABOK.
Питання повинні бути підходящими для початківців бізнес-аналітиків.
Відповідай {{language}} мовою.`,
  ccba: `Створи {{questions}} тестових питань для сертифікації CCBA (Certification of Capability in Business Analysis).
Включи питання середньої складності, що покривають всі області знань BABOK, техніки та базові компетенції.
Питання повинні відображати досвід бізнес-аналітика 3-5 років.
Відповідай {{language}} мовою.`,
  cbap: `Створи {{questions}} тестових питань для сертифікації CBAP (Certified Business Analysis Professional).
Створюй складні питання, що вимагають глибокого розуміння BABOK, аналізу складних сценаріїв та стратегічного мислення.
Питання повинні бути підходящими для досвідчених бізнес-аналітиків з досвідом 5+ років.
Відповідай {{language}} мовою.`,
}

export default function HomePage() {
  const [selectedLevel, setSelectedLevel] = useState<CertificationLevel | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("українська")
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(50)
  const [systemPrompts, setSystemPrompts] = useState<Record<CertificationLevel, string>>(defaultPrompts)
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadLink, setDownloadLink] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<CertificationLevel | null>(null)
  const [totalTests, setTotalTests] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)

  const availableLanguages = ["english"]

  const questionCountOptions = [10, 20, 30, 50, 75, 100, 150, 200]

  const handleLevelSelect = (level: CertificationLevel) => {
    setSelectedLevel(level)
  }

  const openPromptModal = (level: CertificationLevel) => {
    setEditingLevel(level)
    setModalOpen(true)
  }

  const savePrompt = (prompt: string) => {
    if (editingLevel) {
      setSystemPrompts((prev) => ({ ...prev, [editingLevel]: prompt }))
    }
    setModalOpen(false)
  }

  const generateTest = async () => {
    if (!selectedLevel) {
      alert("Будь ласка, оберіть рівень сертифікації")
      return
    }

    setIsGenerating(true)
    setShowProgress(true)
    setProgress(0)
    setCurrentStep(0)
    setDownloadLink(null)

    const questionCount = selectedQuestionCount
    const prompt = systemPrompts[selectedLevel]

    const messages = [
      "Підготовка системи генерації...",
      "Завантаження бази знань BABOK v3...",
      `Формування питань згідно з рівнем ${selectedLevel.toUpperCase()}...`,
      `Генерація ${questionCount} унікальних питань...`,
      "Перевірка якості та релевантності...",
      "Компіляція PDF документу...",
      "Фіналізація тесту...",
    ]

    let currentProgress = 0
    let messageIndex = 0

    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 10
      if (currentProgress > 85) currentProgress = 85

      setProgress(currentProgress)

      if (currentProgress > 10 && currentStep < 1) setCurrentStep(1)
      if (currentProgress > 25 && currentStep < 2) setCurrentStep(2)
      if (currentProgress > 50 && currentStep < 3) setCurrentStep(3)

      if (Math.random() > 0.7 && messageIndex < messages.length - 2) {
        setProgressMessage(messages[messageIndex])
        messageIndex++
      }
    }, 300)

    try {
      // Крок 1: Генерація питань
      setProgressMessage("Генерація питань через AI...")

      const generateResponse = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: selectedLevel,
          questionCount: questionCount,
          language: selectedLanguage,
          systemPrompt: prompt
            .replace("{{questions}}", String(questionCount))
            .replace("{{level}}", selectedLevel.toUpperCase())
            .replace("{{language}}", selectedLanguage)
        }),
      })

      if (!generateResponse.ok) {
        throw new Error('Помилка генерації питань')
      }

      const generateData = await generateResponse.json()

      if (!generateData.success || !generateData.questions) {
        throw new Error(generateData.error || 'Не вдалося згенерувати питання')
      }

      // Оновлюємо прогрес
      setProgress(90)
      setCurrentStep(4)
      setProgressMessage("Компіляція PDF документу...")

      // Крок 2: Генерація PDF
      const pdfResponse = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: selectedLevel,
          questionCount: questionCount,
          language: selectedLanguage,
          questions: generateData.questions
        }),
      })

      if (!pdfResponse.ok) {
        throw new Error('Помилка генерації PDF')
      }

      // Отримуємо PDF як blob
      const pdfBlob = await pdfResponse.blob()

      // Створюємо URL для завантаження
      const pdfUrl = URL.createObjectURL(pdfBlob)

      clearInterval(progressInterval)
      setProgress(100)
      setCurrentStep(4)
      setProgressMessage("Тест успішно згенеровано!")

      setTimeout(() => {
        setShowProgress(false)
        setIsGenerating(false)
        setDownloadLink(pdfUrl)
        setTotalTests((prev) => prev + 1)
        setTotalQuestions((prev) => prev + questionCount)
      }, 1000)

    } catch (error) {
      clearInterval(progressInterval)
      setShowProgress(false)
      setIsGenerating(false)

      console.error('Помилка генерації тесту:', error)
      alert(`Помилка генерації тесту: ${error instanceof Error ? error.message : 'Невідома помилка'}`)
    }
  }

  // const regenerateAnswers = async () => {
  //   if (!selectedLevel) return

  //   setIsGenerating(true)
  //   setShowProgress(true)
  //   setProgress(0)
  //   setCurrentStep(2)
  //   setDownloadLink(null)

  //   const questionCount = selectedQuestionCount

  //   const messages = [
  //     "Генерація нових варіантів відповідей...",
  //     "Формування альтернативних відповідей...",
  //     "Оновлення PDF документу...",
  //   ]

  //   let currentProgress = 0
  //   let messageIndex = 0

  //   const progressInterval = setInterval(() => {
  //     currentProgress += Math.random() * 25
  //     if (currentProgress > 95) currentProgress = 95

  //     setProgress(currentProgress)

  //     if (currentProgress > 30 && currentStep < 3) {
  //       setCurrentStep(3)
  //       setProgressMessage("Формування альтернативних відповідей...")
  //     }
  //     if (currentProgress > 60 && currentStep < 4) {
  //       setCurrentStep(4)
  //       setProgressMessage("Оновлення PDF документу...")
  //     }

  //     if (Math.random() > 0.7 && messageIndex < messages.length) {
  //       setProgressMessage(messages[messageIndex])
  //       messageIndex++
  //     }
  //   }, 150)

  //   setTimeout(() => {
  //     clearInterval(progressInterval)
  //     setProgress(100)
  //     setCurrentStep(4)
  //     setProgressMessage("Відповіді успішно оновлено!")

  //     setTimeout(() => {
  //       setShowProgress(false)
  //       setIsGenerating(false)
  //       setDownloadLink(`#test-${selectedLevel}-${questionCount}-regenerated-${Date.now()}.pdf`)
  //     }, 1000)
  //   }, 2500)
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-5">
      <div className="bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-10 max-w-[800px] w-full animate-slideUp">
        <div className="text-center mb-10">
          <div className="w-[60px] h-[60px] mx-auto mb-5 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-[15px] flex items-center justify-center text-white text-2xl font-bold">
            BA
          </div>
          <h1 className="text-[#2d3748] text-[28px] mb-2.5 font-bold">Генератор тестів IIBA</h1>
          <p className="text-[#718096] text-base">Створюйте персоналізовані тести для підготовки до сертифікації</p>
        </div>

        <div className="mb-[30px]">
          {levels.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              selected={selectedLevel === level.id}
              onSelect={handleLevelSelect}
              onEditPrompt={openPromptModal}
            />
          ))}
        </div>

        <div className="bg-[#f7fafc] rounded-xl p-[25px] mt-[30px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[25px]">
            <div>
              <label className="block text-[#2d3748] text-sm font-semibold mb-2">
                Мова тестів
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-[10px] text-[#2d3748] bg-white focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent"
              >
                {availableLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#2d3748] text-sm font-semibold mb-2">
                Кількість питань
              </label>
              <select
                value={selectedQuestionCount}
                onChange={(e) => setSelectedQuestionCount(Number(e.target.value))}
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-[10px] text-[#2d3748] bg-white focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent"
              >
                {questionCountOptions.map((count) => (
                  <option key={count} value={count}>
                    {count} питань
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-[15px] items-center flex-wrap">
            <button
              className="px-[30px] py-3 border-none rounded-[10px] text-base font-semibold cursor-pointer transition-all duration-300 inline-flex items-center gap-2 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white hover:translate-y-[-2px] hover:shadow-[0_10px_20px_rgba(102,126,234,0.3)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              onClick={generateTest}
              disabled={isGenerating || !selectedLevel}
            >
              <span>Згенерувати</span>
              {isGenerating && (
                <div className="w-5 h-5 border-[3px] border-[#f3f3f3] border-t-[3px] border-t-[#667eea] rounded-full animate-spin" />
              )}
            </button>

            <a
              href={downloadLink || "#"}
              download={downloadLink ? `test-${selectedLevel}-${selectedQuestionCount}-${Date.now()}.pdf` : undefined}
              className={`flex-1 min-w-[200px] px-5 py-3 rounded-[10px] text-center text-sm transition-all duration-300 no-underline ${downloadLink
                ? "border-2 border-solid border-[#48bb78] bg-[#f0fff4] text-[#22543d] cursor-pointer hover:bg-[#48bb78] hover:text-white"
                : "border-2 border-dashed border-[#cbd5e0] bg-white text-[#4a5568]"
                }`}
              onClick={(e) => {
                if (downloadLink && downloadLink !== "#") {
                  // Справжнє завантаження PDF файлу
                  const link = document.createElement('a')
                  link.href = downloadLink
                  link.download = `test-${selectedLevel}-${selectedQuestionCount}-${Date.now()}.pdf`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                } else {
                  e.preventDefault()
                }
              }}
            >
              {downloadLink
                ? `📄 Завантажити тест ${selectedLevel?.toUpperCase()} (${selectedQuestionCount} питань)`
                : "Посилання на PDF з'явиться тут"}
            </a>

            {/* <button
              className="px-[30px] py-3 border-2 border-solid border-[#667eea] rounded-[10px] text-base font-semibold cursor-pointer transition-all duration-300 inline-flex items-center gap-2 bg-white text-[#667eea] hover:bg-[#667eea] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={regenerateAnswers}
              disabled={!downloadLink || isGenerating}
            >
              ↻ Перегенерувати відповіді
            </button> */}
          </div>

          {showProgress && <ProgressBar progress={progress} currentStep={currentStep} message={progressMessage} />}
        </div>

        <StatsDisplay totalTests={totalTests} totalQuestions={totalQuestions} />
      </div>

      {modalOpen && editingLevel && (
        <PromptModal
          level={editingLevel}
          initialPrompt={systemPrompts[editingLevel]}
          onSave={savePrompt}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
