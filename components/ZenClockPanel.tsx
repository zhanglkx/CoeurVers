interface ZenClockPanelProps {
  time: Date
  isZenFocus: boolean
  greeting: string
  onToggleZen: () => void
}

export function ZenClockPanel({ time, isZenFocus, greeting, onToggleZen }: ZenClockPanelProps) {
  const timeLine = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })

  return (
    <div
      className={`flex w-full max-w-5xl flex-col items-center tabliss-zen-ease transition-[padding,flex-grow] duration-500 ${
        isZenFocus ? "flex-1 justify-center py-8" : "shrink-0 pt-[10vh] pb-2"
      }`}
    >
      <button
        type="button"
        onClick={onToggleZen}
        className="tabliss-time-stack text-center select-none px-6 sm:px-12 py-6 tabliss-zen-ease duration-500 outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent cursor-pointer"
        aria-pressed={isZenFocus}
        aria-label={isZenFocus ? "显示快捷方式" : "隐藏快捷方式并放大时钟"}
      >
        <h1
          className={`tabliss-time-digital text-white drop-shadow-[0_2px_28px_rgba(0,0,0,0.5)] tabliss-zen-ease transition-[font-size,margin,line-height] duration-500 ${
            isZenFocus ? "text-[clamp(3.5rem,15vw,10.5rem)] leading-[0.92] mt-0" : "text-6xl sm:text-7xl md:text-8xl leading-none mt-0"
          }`}
        >
          {timeLine}
        </h1>
        <h2
          className={`tabliss-time-greeting text-white/90 tabliss-zen-ease transition-[font-size,margin,opacity] duration-500 ${
            isZenFocus ? "text-[clamp(1.2rem,4vw,5rem)] mt-6 sm:mt-12 opacity-95" : "text-xl sm:text-2xl md:text-3xl mt-4 opacity-92"
          }`}
        >
          {greeting}
        </h2>
        {!isZenFocus && (
          <p className="text-[11px] sm:text-xs text-white/50 font-medium tracking-[0.2em] uppercase mt-5 tabliss-zen-ease transition-opacity duration-500">
            {time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </p>
        )}
      </button>
    </div>
  )
}
