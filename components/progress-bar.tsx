interface ProgressBarProps {
  progress: number
  currentStep: number
  message: string
}

const steps = ["Ініціалізація генератора", "Аналіз вимог сертифікації", "Генерація питань", "Формування PDF документу"]

export function ProgressBar({ progress, currentStep, message }: ProgressBarProps) {
  return (
    <div className="mt-5 p-5 bg-[#f8f9ff] rounded-xl animate-slideDown">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-[#4a5568]">Генерація тесту...</span>
        <span className="text-sm font-semibold text-[#667eea]">{Math.floor(progress)}%</span>
      </div>

      <div className="w-full h-2 bg-[#e2e8f0] rounded-[10px] overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-[10px] transition-[width] duration-300 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-[rgba(255,255,255,0.3)] after:to-transparent after:animate-shimmer"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-[15px] flex flex-col gap-2">
        {steps.map((step, index) => {
          const isActive = currentStep === index + 1
          const isCompleted = currentStep > index + 1

          return (
            <div
              key={index}
              className={`flex items-center gap-2.5 text-[13px] transition-all duration-300 ${
                isActive ? "text-[#667eea] font-medium" : isCompleted ? "text-[#48bb78]" : "text-[#718096]"
              }`}
            >
              <span
                className={`w-5 h-5 border-2 border-solid rounded-full flex items-center justify-center transition-all duration-300 text-xs ${
                  isActive
                    ? "border-[#667eea] bg-[#667eea] text-white animate-pulse"
                    : isCompleted
                      ? "border-[#48bb78] bg-[#48bb78] text-white"
                      : "border-[#e2e8f0]"
                }`}
              >
                {isCompleted ? "✓" : isActive ? "●" : "○"}
              </span>
              <span>{step}</span>
            </div>
          )
        })}
      </div>

      {message && (
        <div className="mt-3 p-2.5 bg-white rounded-lg text-[13px] text-[#4a5568] italic opacity-0 animate-fadeIn">
          {message}
        </div>
      )}
    </div>
  )
}
