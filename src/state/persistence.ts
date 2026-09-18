import { DEFAULT_CONSTRAINTS, FONTS, LANGUAGES, PRESET_TEXTS, VERSIONS } from '../engine/presets';
import type { Constraints, Language, TextsMap, VersionId } from '../engine/types';

/** 写入 localStorage 的状态（不含撤销历史） */
export interface PersistedState {
  v: 1;
  texts: TextsMap;
  constraints: Constraints;
  language: Language;
  version: VersionId;
  compareMode: boolean;
}

/** 可注入的存储接口（测试用内存实现，浏览器用 localStorage） */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = 'packproof:v1';

function defaultStorage(): StorageLike | null {
  try {
    return typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? (globalThis.localStorage as StorageLike)
      : null;
  } catch {
    return null;
  }
}

export function saveState(
  state: PersistedState,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用（隐私模式/配额满）：静默忽略，不影响使用
  }
}

/** 从存储恢复；内容缺失或损坏时返回 null（调用方回退到预设） */
export function loadState(storage: StorageLike | null = defaultStorage()): PersistedState | null {
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState> | null;
    if (!parsed || parsed.v !== 1) return null;
    return {
      v: 1,
      texts: mergeTexts(parsed.texts),
      constraints: sanitizeConstraints(parsed.constraints),
      language: LANGUAGES.some((l) => l.id === parsed.language) ? (parsed.language as Language) : 'zh',
      version: VERSIONS.some((v) => v.id === parsed.version) ? (parsed.version as VersionId) : 'base',
      compareMode: parsed.compareMode === true,
    };
  } catch {
    return null;
  }
}

/** 以预设为底、覆盖用户保存的文案（预设新增字段不会丢） */
function mergeTexts(saved: unknown): TextsMap {
  const merged = JSON.parse(JSON.stringify(PRESET_TEXTS)) as TextsMap;
  if (!saved || typeof saved !== 'object') return merged;
  for (const [blockId, langs] of Object.entries(saved as Record<string, unknown>)) {
    const target = merged[blockId] as unknown as Record<string, Record<string, string>> | undefined;
    if (!target || !langs || typeof langs !== 'object') continue;
    for (const [lang, versions] of Object.entries(langs as Record<string, unknown>)) {
      const targetLang = target[lang];
      if (!targetLang || !versions || typeof versions !== 'object') continue;
      for (const [version, text] of Object.entries(versions as Record<string, unknown>)) {
        if (typeof text === 'string' && version in targetLang) {
          targetLang[version] = text;
        }
      }
    }
  }
  return merged;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** 校验并修正约束：数值有限、min≤max、字体至少一种且在已知列表内 */
export function sanitizeConstraints(input: unknown): Constraints {
  const d = DEFAULT_CONSTRAINTS;
  if (!input || typeof input !== 'object') return { ...d };
  const c = input as Partial<Constraints>;
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  let minFontSizePt = clamp(num(c.minFontSizePt, d.minFontSizePt), 4, 20);
  let maxFontSizePt = clamp(num(c.maxFontSizePt, d.maxFontSizePt), 4, 20);
  let minLineHeight = clamp(num(c.minLineHeight, d.minLineHeight), 1, 2);
  let maxLineHeight = clamp(num(c.maxLineHeight, d.maxLineHeight), 1, 2);
  if (minFontSizePt > maxFontSizePt) [minFontSizePt, maxFontSizePt] = [maxFontSizePt, minFontSizePt];
  if (minLineHeight > maxLineHeight) [minLineHeight, maxLineHeight] = [maxLineHeight, minLineHeight];
  const validFonts = new Set(FONTS.map((f) => f.id));
  const allowedFonts = Array.isArray(c.allowedFonts)
    ? [...new Set(c.allowedFonts.filter((f): f is string => typeof f === 'string' && validFonts.has(f)))]
    : [];
  return {
    allowedFonts: allowedFonts.length > 0 ? allowedFonts : [...d.allowedFonts],
    minFontSizePt,
    maxFontSizePt,
    minLineHeight,
    maxLineHeight,
  };
}
