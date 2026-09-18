import { defaultConstraints, productSpec } from '../data/product';
import type { CopyVersion, LanguageCode, ProductSpec, ZoneConstraints } from '../types';

/** 内置数据结构版本：结构变更时递增，旧存档自动作废 */
export const DATA_VERSION = 1;
export const STORAGE_KEY = 'packproof.workspace.v1';

/** 工作台状态：所有可撤销、可持久化的内容 */
export interface WorkspaceState {
  dataVersion: number;
  language: LanguageCode;
  versionId: string;
  /** 对比基准版本；null 表示关闭对比 */
  compareWith: string | null;
  constraints: Record<string, ZoneConstraints>;
  versions: CopyVersion[];
}

export function createInitialState(spec: ProductSpec = productSpec): WorkspaceState {
  return {
    dataVersion: DATA_VERSION,
    language: 'zh',
    versionId: spec.versions[0].id,
    compareWith: null,
    constraints: defaultConstraints(spec),
    versions: spec.versions,
  };
}

export type Action =
  | { type: 'set-language'; language: LanguageCode }
  | { type: 'set-version'; versionId: string }
  | { type: 'set-compare'; versionId: string | null }
  | { type: 'edit-copy'; versionId: string; language: LanguageCode; blockId: string; text: string }
  | { type: 'set-constraints'; zoneId: string; constraints: ZoneConstraints };

/** 纯 reducer：无实际变化时返回原引用（配合 commit 跳过空操作） */
export function applyAction(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'set-language': {
      if (state.language === action.language) return state;
      return { ...state, language: action.language };
    }
    case 'set-version': {
      if (state.versionId === action.versionId) return state;
      if (!state.versions.some((v) => v.id === action.versionId)) return state;
      const compareWith = state.compareWith === action.versionId ? null : state.compareWith;
      return { ...state, versionId: action.versionId, compareWith };
    }
    case 'set-compare': {
      const next = action.versionId === state.versionId ? null : action.versionId;
      if (state.compareWith === next) return state;
      return { ...state, compareWith: next };
    }
    case 'edit-copy': {
      const versions = state.versions.map((v) => {
        if (v.id !== action.versionId) return v;
        const blocks = v.copy[action.language].map((b) =>
          b.id === action.blockId ? { ...b, text: action.text } : b,
        );
        return { ...v, copy: { ...v.copy, [action.language]: blocks } };
      });
      return { ...state, versions };
    }
    case 'set-constraints': {
      return { ...state, constraints: { ...state.constraints, [action.zoneId]: action.constraints } };
    }
  }
}

export interface History {
  past: WorkspaceState[];
  present: WorkspaceState;
  future: WorkspaceState[];
  /** 上一次提交的分组合并键（连续输入合并为一步） */
  lastKey: string | null;
}

export function initHistory(state: WorkspaceState): History {
  return { past: [], present: state, future: [], lastKey: null };
}

/**
 * 提交一次修改。key 相同的连续提交会合并（如 textarea 逐字输入、滑杆拖动），
 * 撤销时整组一起回退。
 */
export function commit(history: History, action: Action, key?: string): History {
  const next = applyAction(history.present, action);
  if (next === history.present) return history;
  if (key && key === history.lastKey) {
    return { ...history, present: next };
  }
  return {
    past: [...history.past, history.present],
    present: next,
    future: [],
    lastKey: key ?? null,
  };
}

export function undoHistory(history: History): History {
  if (history.past.length === 0) return history;
  const prev = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: prev,
    future: [history.present, ...history.future],
    lastKey: null,
  };
}

export function redoHistory(history: History): History {
  if (history.future.length === 0) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
    lastKey: null,
  };
}

export function serializeWorkspace(state: WorkspaceState): string {
  return JSON.stringify(state);
}

/** 反序列化并校验；任何不符都返回 null（调用方回退到初始状态） */
export function deserializeWorkspace(json: string): WorkspaceState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Partial<WorkspaceState>;
  if (s.dataVersion !== DATA_VERSION) return null;
  if (s.language !== 'zh' && s.language !== 'en' && s.language !== 'de') return null;
  if (!Array.isArray(s.versions) || s.versions.length === 0) return null;
  if (!s.versions.every((v) => typeof v?.id === 'string' && typeof v?.copy === 'object')) return null;
  if (typeof s.versionId !== 'string' || !s.versions.some((v) => v.id === s.versionId)) return null;
  if (s.compareWith !== null && typeof s.compareWith !== 'string') return null;
  if (typeof s.constraints !== 'object' || s.constraints === null) return null;
  return s as WorkspaceState;
}
