import React, { useState, useEffect } from "react"
import { getFaviconUrl } from "../constants"

interface ShortcutIconProps {
  url: string
  title: string
  icon?: string
  size?: "default" | "small"
}

/**
 * ShortcutIcon 组件
 * 单次尝试：优先本地图标 → favicon → 文字降级
 * 通过 <img onError> 降级，不再额外发送探测请求，显著减少网络开销
 */
export const ShortcutIcon = React.memo<ShortcutIconProps>(
  ({ url, title, icon, size = "default" }) => {
    const sourceSrc = icon || getFaviconUrl(url)
    const [currentSrc, setCurrentSrc] = useState<string>(sourceSrc)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
      setCurrentSrc(sourceSrc)
      setFailed(false)
    }, [sourceSrc])

    const className = size === "default" ? "w-[80%] h-[80%]" : "w-full h-full"
    const baseClass = `${className} relative shrink-0 overflow-hidden rounded-full`

    if (!currentSrc || failed) {
      const textSize = size === "small" ? "text-[10px] leading-none" : "text-2xl"
      return (
        <div className={`${baseClass} flex items-center justify-center bg-white`}>
          <span className={`${textSize} font-bold uppercase tracking-wider text-neutral-700 select-none`}>
            {title.slice(0, 2)}
          </span>
        </div>
      )
    }

    return (
      <div className={baseClass}>
        <img
          src={currentSrc}
          alt=""
          decoding="async"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
          onError={() => setFailed(true)}
          draggable={false}
        />
      </div>
    )
  },
  (prev, next) =>
    prev.url === next.url &&
    prev.icon === next.icon &&
    prev.title === next.title &&
    prev.size === next.size,
)

ShortcutIcon.displayName = "ShortcutIcon"
