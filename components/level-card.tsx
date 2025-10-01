"use client"

import type { CertificationLevel, LevelConfig } from "@/app/page"

interface LevelCardProps {
  level: LevelConfig
  selected: boolean
  onSelect: (level: CertificationLevel) => void
  onEditPrompt: (level: CertificationLevel) => void
}

export function LevelCard({
  level,
  selected,
  onSelect,
  onEditPrompt,
}: LevelCardProps) {
  return (
    <div
      className={`bg-[#f7fafc] border-2 border-solid rounded-xl p-5 mb-[15px] transition-all duration-300 cursor-pointer hover:border-[#667eea] hover:shadow-[0_4px_12px_rgba(102,126,234,0.1)] ${
        selected
          ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300"
          : "border-[#e2e8f0]"
      }`}
      onClick={() => onSelect(level.id)}
    >
      <div className="flex items-center justify-between mb-[15px]">
        <div className="flex items-center gap-2.5">
          <button
            className="w-8 h-8 border-2 border-solid border-[#e2e8f0] rounded-lg bg-white text-[#718096] cursor-pointer flex items-center justify-center transition-all duration-300 text-base hover:bg-[#667eea] hover:border-[#667eea] hover:text-white hover:scale-105"
            onClick={(e) => {
              e.stopPropagation()
              onEditPrompt(level.id)
            }}
            title="Редагувати системний промпт"
          >
            ⚙️
          </button>

          <div className="relative">
            <input
              type="radio"
              name="level"
              value={level.id}
              id={level.id}
              checked={selected}
              onChange={() => onSelect(level.id)}
              className="w-5 h-5 accent-[#667eea] cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="flex-1">
            <div className="font-semibold text-[#2d3748] text-lg mb-1">{level.name}</div>
            <div className="text-[#718096] text-sm">{level.description}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
