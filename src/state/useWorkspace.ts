import { useCallback, useEffect, useState } from 'react';
import type { ProductSpec } from '../types';
import {
  commit,
  createInitialState,
  deserializeWorkspace,
  initHistory,
  redoHistory,
  serializeWorkspace,
  STORAGE_KEY,
  undoHistory,
  type Action,
  type History,
} from './store';

function loadInitial(spec: ProductSpec): History {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const restored = deserializeWorkspace(raw);
        if (restored) return initHistory(restored);
      }
    } catch {
      // 存储不可用或数据损坏：回退初始状态
    }
  }
  return initHistory(createInitialState(spec));
}

/**
 * 工作台状态 hook：
 *  - 所有修改经 dispatch 进入历史栈（可撤销/重做）；
 *  - 每次变化自动写入 localStorage，刷新后恢复；
 *  - reset 清除存档并回到出厂状态。
 */
export function useWorkspace(spec: ProductSpec) {
  const [history, setHistory] = useState<History>(() => loadInitial(spec));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeWorkspace(history.present));
    } catch {
      // 隐私模式等场景下写入失败可忽略，不影响本次会话
    }
  }, [history.present]);

  const dispatch = useCallback((action: Action, key?: string) => {
    setHistory((h) => commit(h, action, key));
  }, []);
  const undo = useCallback(() => setHistory(undoHistory), []);
  const redo = useCallback(() => setHistory(redoHistory), []);
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setHistory(initHistory(createInitialState(spec)));
  }, [spec]);

  return {
    state: history.present,
    dispatch,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    reset,
  };
}
