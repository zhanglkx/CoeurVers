import { useState, useEffect, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"

interface LocalStorageCodec<T> {
  parse: (raw: string) => T
  serialize: (value: T) => string
}

export function useLocalStorageState<T>(
  key: string,
  getDefault: () => T,
  codec: LocalStorageCodec<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved === null) return getDefault()
      return codec.parse(saved)
    } catch {
      return getDefault()
    }
  })

  const serializeRef = useRef(codec.serialize)
  serializeRef.current = codec.serialize

  useEffect(() => {
    try {
      localStorage.setItem(key, serializeRef.current(state))
    } catch {
      /* quota / private mode */
    }
  }, [key, state])

  return [state, setState]
}
