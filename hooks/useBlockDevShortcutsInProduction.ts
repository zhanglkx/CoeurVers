import { useEffect } from "react"

export function useBlockDevShortcutsInProduction() {
  useEffect(() => {
    const isProduction = !window.location.href.includes("localhost") && !window.location.href.includes("127.0.0.1")
    if (!isProduction) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F12") {
        e.preventDefault()
        return
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.keyCode === 73)) {
        e.preventDefault()
        return
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.keyCode === 74)) {
        e.preventDefault()
        return
      }
      if (e.ctrlKey && (e.key === "U" || e.keyCode === 85)) e.preventDefault()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])
}
