# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoeurVers is a Chrome extension that provides a highly customizable new tab page. It features:
- Curated wallpaper gallery with slideshow mode and local uploads
- Drag-and-drop shortcut grid with folders and nested navigation
- Zen clock mode for focused time display
- All data stored locally (localStorage + IndexedDB)

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Lucide React

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Build and package extension as zip
npm run pack
```

**Note:** The dev server runs on port 5173 (Vite default), not 3000 as stated in README.

## Testing as Chrome Extension

After building:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder
4. Open a new tab to see the extension

## Architecture

### State Management

All state persists in `localStorage` using custom hooks with type-safe codecs:
- **Settings** (`AppSettings`) - wallpaper mode, grid config, blur level, etc.
- **Shortcuts** (`Shortcut[]`) - tree of links and folders
- **Bookmark Navigation** (`BookmarkNavState`) - current folder drill-down path

Hook: `useLocalStorageState(key, defaultFactory, codec)` handles persistence with JSON serialization.

### Core Data Structures

**Shortcut:**
```typescript
interface Shortcut {
  id: string
  title: string
  url: string
  icon?: string           // Custom icon URL
  type?: "link" | "folder"
  children?: Shortcut[]   // For folders, unlimited nesting
}
```

**Bookmark Navigation:**
- `activePageId` - current page (either `ITAB_LOOSE_PARENT_KEY` for root or a folder ID)
- `drillFolderIds` - breadcrumb trail of nested folders

### Key Modules

**`lib/shortcuts-tree.ts`** - Immutable tree operations:
- All operations are pure functions that return new arrays
- `ITAB_LOOSE_PARENT_KEY` constant represents ungrouped root shortcuts
- Root level always organizes as: loose links → folders
- Operations: add, remove, edit, reorder, merge (drag to combine), move to root
- Singleton folders auto-unwrap when their last child is removed

**`lib/storage-codecs.ts`** - Serialization/deserialization:
- Codecs define `parse()` and `serialize()` for type-safe localStorage
- Settings normalization ensures backwards compatibility

**`services/wallpaper-cache.ts`** - IndexedDB caching:
- Caches wallpaper Blobs locally for instant display on refresh
- Gracefully handles quota errors and private mode
- Uses object URLs; caller must revoke when done

**`services/background.ts`** - Wallpaper service:
- Manages Unsplash curated gallery rotation
- Handles slideshow timer and favorite filtering

**Hooks:**
- `useLocalStorageState` - Persistent state with codecs
- `useWallpaperDisplay` - Manages wallpaper loading and caching
- `useClock` - Time updates for zen clock

### Component Hierarchy

```
App.tsx (root state container)
├── ZenClockPanel (clock mode toggle)
├── ShortcutGrid (drag-and-drop grid)
│   └── Nested folder navigation
└── SettingsModal (configuration UI)
```

**App.tsx** is the single source of truth:
- Holds all state (settings, shortcuts, navigation)
- Passes callbacks down for state updates
- Manages zen mode toggle and wallpaper display

**ShortcutGrid.tsx** handles:
- Rendering current navigation level
- Drag-and-drop for reordering and merging
- Folder drilling (click to enter, breadcrumb to exit)
- Right-click context menu for edit/delete
- Icon fetching and fallback text icons

## Important Patterns

### Immutable Updates
All shortcut tree modifications return new arrays. Never mutate in place:
```typescript
// ✓ Correct
setShortcuts(prev => addShortcutUnderParent(prev, parentKey, newItem))

// ✗ Wrong
shortcuts.push(newItem)
```

### The "Loose Parent" Concept
Root-level ungrouped shortcuts use the virtual parent key `ITAB_LOOSE_PARENT_KEY` ("__loose__"). When adding or reordering at root, always check if `parentKey === ITAB_LOOSE_PARENT_KEY`.

### Folder Normalization
At the root level, links always appear before folders. Functions like `normalizeItabBookmarksRoot()` enforce this ordering.

### Drag-and-Drop Semantics
- **Reorder:** Dragging onto empty space within same parent
- **Merge:** Dragging one item onto another item
  - Link + Link → creates new folder with both
  - Link + Folder → adds link to folder
  - Folder + Folder → no-op (can't merge folders)

### Wallpaper Caching Flow
1. Check IndexedDB cache first (instant display)
2. Fetch from network in background
3. Update cache for next load
4. Use `URL.createObjectURL()` for Blobs; remember to revoke

## Extension Configuration

**Manifest V3** (`public/manifest.json`):
- Overrides Chrome new tab with `index.html`
- Permissions: `storage` for future chrome.storage API use
- Host permissions for search suggestion APIs (currently unused)
- CSP restricts scripts to self-hosted only

## File Organization

```
components/     # React UI components
hooks/          # Custom React hooks
lib/            # Pure utility functions (tree ops, icons, storage)
services/       # Side-effect services (wallpaper, cache)
public/         # Static assets (manifest, icons)
types.ts        # Global TypeScript types
App.tsx         # Root component
```

## Code Style Notes

- Use named exports for utilities, default export for components
- Prefer `type` over `interface` for data shapes
- All tree operations are pure functions
- Use optional chaining (`?.`) for potentially undefined children arrays
- Chinese comments are acceptable for domain-specific logic

## Common Tasks

**Add a new shortcut tree operation:**
1. Add pure function to `lib/shortcuts-tree.ts`
2. Add handler in `App.tsx` that calls `setShortcuts(prev => yourOperation(prev, ...))`
3. Pass handler down to `ShortcutGrid` as prop

**Modify settings:**
1. Update `AppSettings` type in `types.ts`
2. Update `DEFAULT_SETTINGS` in `lib/settings.ts`
3. Add normalization in `normalizeSettings()` for backwards compat
4. Update `SettingsModal.tsx` UI

**Change wallpaper behavior:**
- Gallery list: `services/background.ts`
- Caching logic: `services/wallpaper-cache.ts`
- Display hook: `hooks/useWallpaperDisplay.ts`
