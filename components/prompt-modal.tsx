"use client"

import { useState } from "react"
import type { CertificationLevel } from "@/app/page"

interface PromptModalProps {
  level: CertificationLevel
  initialPrompt: string
  onSave: (prompt: string) => void
  onClose: () => void
}

const promptTemplates: Record<string, string> = {
  basic: `Create {{questions}} test questions for CCBA (Certification of Capability in Business Analysis) certification.
Respond in {{language}} language.`,
  detailed: `Create {{questions}} test questions for CCBA (Certification of Capability in Business Analysis) certification.
Respond in {{language}} language.`,
  babok: `Create {{questions}} test questions for CCBA (Certification of Capability in Business Analysis) certification.
Respond in {{language}} language.`,
  practical: `Create {{questions}} test questions for CCBA (Certification of Capability in Business Analysis) certification.
Respond in {{language}} language.`,
}

export function PromptModal({ level, initialPrompt, onSave, onClose }: PromptModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      onSave(prompt)
      setSaving(false)
    }, 500)
  }

  const insertTemplate = (templateName: string) => {
    setPrompt(promptTemplates[templateName])
  }

  return (
    <div
      className="fixed z-[1000] left-0 top-0 w-full h-full bg-[rgba(0,0,0,0.5)] flex justify-center items-center animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] p-[30px] max-w-[600px] w-[90%] max-h-[80vh] overflow-y-auto animate-slideUpModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 pb-[15px] border-b-2 border-solid border-[#e2e8f0]">
          <h2 className="text-xl font-semibold text-[#2d3748]">
            Редагувати системний промпт - <span>{level.toUpperCase()}</span>
          </h2>
          <button
            className="w-8 h-8 border-none bg-[#f7fafc] rounded-lg text-[#718096] text-xl cursor-pointer transition-all duration-300 hover:bg-[#e2e8f0] hover:text-[#2d3748]"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="mb-[15px] p-3 bg-[#f0f9ff] border-l-4 border-solid border-[#667eea] rounded-lg text-[#4a5568] text-sm">
          💡 Налаштуйте системний промпт для генерації тестів. Використовуйте змінні: {`{{level}}`}, {`{{questions}}`}
        </div>

        <div className="flex gap-2.5 my-[15px] flex-wrap">
          {Object.keys(promptTemplates).map((templateName) => (
            <span
              key={templateName}
              className="px-3 py-1.5 bg-[#edf2f7] rounded-[20px] text-xs text-[#4a5568] cursor-pointer transition-all duration-200 hover:bg-[#667eea] hover:text-white"
              onClick={() => insertTemplate(templateName)}
            >
              {templateName === "basic" && "Базовий"}
              {templateName === "detailed" && "Детальний"}
              {templateName === "babok" && "BABOK-focused"}
              {templateName === "practical" && "Практичний"}
            </span>
          ))}
        </div>

        <textarea
          className="w-full min-h-[300px] p-[15px] border-2 border-solid border-[#e2e8f0] rounded-xl font-mono text-sm leading-relaxed resize-y transition-[border-color] duration-300 focus:outline-none focus:border-[#667eea] focus:bg-[#fafbff]"
          placeholder="Введіть системний промпт..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <div className="flex gap-2.5 mt-5 justify-end">
          <button
            className="px-[30px] py-3 border-2 border-solid border-[#e2e8f0] rounded-[10px] text-base font-semibold cursor-pointer transition-all duration-300 bg-[#f7fafc] text-[#718096] hover:bg-[#e2e8f0] hover:border-[#cbd5e0]"
            onClick={onClose}
          >
            Скасувати
          </button>
          <button
            className="px-[30px] py-3 border-none rounded-[10px] text-base font-semibold cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#48bb78] to-[#38a169] text-white hover:shadow-[0_10px_20px_rgba(72,187,120,0.3)]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Збережено ✓" : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  )
}
