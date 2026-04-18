import type { AppSettings, Shortcut, Note } from "../types"
import { normalizeSettings } from "./settings"

export const settingsStorageCodec = {
  parse: (raw: string): AppSettings => normalizeSettings(JSON.parse(raw)),
  serialize: (v: AppSettings) => JSON.stringify(v),
}

export const shortcutsStorageCodec = {
  parse: (raw: string): Shortcut[] => JSON.parse(raw) as Shortcut[],
  serialize: (v: Shortcut[]) => JSON.stringify(v),
}

export const notesStorageCodec = {
  parse: (raw: string): Note[] => JSON.parse(raw) as Note[],
  serialize: (v: Note[]) => JSON.stringify(v),
}
