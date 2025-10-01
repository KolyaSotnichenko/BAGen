interface StatsDisplayProps {
  totalTests: number
  totalQuestions: number
}

export function StatsDisplay({ totalTests, totalQuestions }: StatsDisplayProps) {
  const avgQuestions = totalTests > 0 ? Math.round(totalQuestions / totalTests) : 0

  return (
    <div className="flex gap-5 mt-[30px] pt-5 border-t border-solid border-[#e2e8f0]">
      <div className="flex-1 text-center">
        <div className="text-2xl font-bold text-[#667eea]">{totalTests}</div>
        <div className="text-[#718096] text-sm mt-1">Згенеровано тестів</div>
      </div>
      <div className="flex-1 text-center">
        <div className="text-2xl font-bold text-[#667eea]">{totalQuestions}</div>
        <div className="text-[#718096] text-sm mt-1">Всього питань</div>
      </div>
      <div className="flex-1 text-center">
        <div className="text-2xl font-bold text-[#667eea]">{avgQuestions}</div>
        <div className="text-[#718096] text-sm mt-1">Середня кількість питань</div>
      </div>
    </div>
  )
}
