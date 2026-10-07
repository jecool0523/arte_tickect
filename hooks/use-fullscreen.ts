"use client"

import { useEffect, useRef, useState } from "react"

export function useFullscreen() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const container = containerRef.current
    setIsSupported(document.fullscreenEnabled === true && typeof container?.requestFullscreen === "function")
    const sync = () => setIsFullscreen(container !== null && document.fullscreenElement === container)
    sync()
    document.addEventListener("fullscreenchange", sync)
    return () => {
      document.removeEventListener("fullscreenchange", sync)
      if (container && document.fullscreenElement === container) {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container || !isSupported || isPending) return
    setError("")
    setIsPending(true)
    try {
      if (document.fullscreenElement === container) await document.exitFullscreen()
      else await container.requestFullscreen()
    } catch {
      setError("전체 화면을 전환하지 못했습니다. 브라우저에서 허용되어 있는지 확인해주세요.")
    } finally {
      setIsPending(false)
    }
  }

  return { containerRef, isFullscreen, isSupported, isPending, error, toggleFullscreen }
}
