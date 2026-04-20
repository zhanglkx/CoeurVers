import type { AppSettings, Shortcut } from "../types"
import { normalizeSettings } from "./settings"

export const settingsStorageCodec = {
  parse: (raw: string): AppSettings => normalizeSettings(JSON.parse(raw)),
  serialize: (v: AppSettings) => JSON.stringify(v),
}

export const shortcutsStorageCodec = {
  parse: (raw: string): Shortcut[] => JSON.parse(raw) as Shortcut[],
  serialize: (v: Shortcut[]) => JSON.stringify(v),
}
