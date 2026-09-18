import { DEFAULT_CONSTRAINTS, PRESET_TEXTS } from '../engine/presets';
import type { Constraints, Language, TextsMap, VersionId } from '../engine/types';
import { loadState, type PersistedState } from './persistence';

/** 可撤销的文档部分（文案 + 约束） */
export interface DocState {
  texts: TextsMap;
  constraints: Constraints;
}

export interface WorkbenchState extends DocState {
  language: Language;
  version: VersionId;
  compareMode: boolean;
  past: DocState[];
  future: DocState[];
  /** 用于合并连续编辑（如同一输入框的连续击键） */
  lastEditKey: string | null;
}

export type Action =
  | { type: 'SET_TEXT'; blockId: string; language: Language; version: VersionId; text: string }
  | { type: 'SET_CONSTRAINTS'; constraints: Constraints }
  | { type: 'SET_LANGUAGE'; language: Language }
  | { type: 'SET_VERSION'; version: VersionId }
  | { type: 'TOGGLE_COMPARE' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

const HISTORY_LIMIT = 100;

export function docOf(s: WorkbenchState): DocState {
  return { texts: s.texts, constraints: s.constraints };
}

export function presetDoc(): DocState {
  return { texts: PRESET_TEXTS, constraints: { ...DEFAULT_CONSTRAINTS, allowedFonts: [...DEFAULT_CONSTRAINTS.allowedFonts] } };
}

/** 初始化：优先从 localStorage 恢复（刷新恢复），否则用内置预设 */
export function initWorkbench(): WorkbenchState {
  const restored = loadState();
  const doc = presetDoc();
  return {
    texts: restored?.texts ?? doc.texts,
    constraints: restored?.constraints ?? doc.constraints,
    language: restored?.language ?? 'zh',
    version: restored?.version ?? 'base',
    compareMode: restored?.compareMode ?? false,
    past: [],
    future: [],
    lastEditKey: null,
  };
}

function pushHistory(s: WorkbenchState, next: DocState, editKey: string | null): WorkbenchState {
  const past = [...s.past, docOf(s)].slice(-HISTORY_LIMIT);
  return { ...s, ...next, past, future: [], lastEditKey: editKey };
}

export function reducer(s: WorkbenchState, a: Action): WorkbenchState {
  switch (a.type) {
    case 'SET_TEXT': {
      const key = `text:${a.blockId}:${a.language}:${a.version}`;
      const block = s.texts[a.blockId];
      if (!block) return s;
      const texts: TextsMap = {
        ...s.texts,
        [a.blockId]: {
          ...block,
          [a.language]: { ...block[a.language], [a.version]: a.text },
        },
      };
      const next: DocState = { texts, constraints: s.constraints };
      // 同一输入框的连续编辑合并为一步，撤销时一次回到编辑前
      if (s.lastEditKey === key) return { ...s, ...next };
      return pushHistory(s, next, key);
    }
    case 'SET_CONSTRAINTS': {
      const next: DocState = { texts: s.texts, constraints: a.constraints };
      if (s.lastEditKey === 'constraints') return { ...s, ...next };
      return pushHistory(s, next, 'constraints');
    }
    case 'SET_LANGUAGE':
      return { ...s, language: a.language, lastEditKey: null };
    case 'SET_VERSION':
      return { ...s, version: a.version, lastEditKey: null };
    case 'TOGGLE_COMPARE':
      return { ...s, compareMode: !s.compareMode, lastEditKey: null };
    case 'UNDO': {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return {
        ...s,
        ...prev,
        past: s.past.slice(0, -1),
        future: [docOf(s), ...s.future],
        lastEditKey: null,
      };
    }
    case 'REDO': {
      const next = s.future[0];
      if (!next) return s;
      return {
        ...s,
        ...next,
        past: [...s.past, docOf(s)],
        future: s.future.slice(1),
        lastEditKey: null,
      };
    }
    case 'RESET':
      return { ...s, ...presetDoc(), past: [], future: [], lastEditKey: null };
  }
}

export function persistedOf(s: WorkbenchState): PersistedState {
  return {
    v: 1,
    texts: s.texts,
    constraints: s.constraints,
    language: s.language,
    version: s.version,
    compareMode: s.compareMode,
  };
}
