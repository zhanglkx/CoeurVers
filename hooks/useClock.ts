import { useState, useEffect } from "react"

/**
 * 返回当前时间；默认按分钟更新（Zen 时钟只展示 HH:mm）。
 * 使用 setTimeout 对齐到下一分钟的边界，避免每次跨分钟时最多 60s 的延迟误差，
 * 同时将 re-render 从每秒降到每分钟，显著降低整棵树的重渲染频率。
 */
export function useClock(granularityMs: number = 60_000) {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    let timerId: number

    function tick() {
      setTime(new Date())
      const drift = Date.now() % granularityMs
      const nextDelay = granularityMs - drift
      timerId = window.setTimeout(tick, nextDelay)
    }

    const initialDrift = Date.now() % granularityMs
    timerId = window.setTimeout(tick, granularityMs - initialDrift)

    return () => window.clearTimeout(timerId)
  }, [granularityMs])

  return time
}
