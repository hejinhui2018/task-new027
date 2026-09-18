import { describe, expect, it } from 'vitest';
import { computeLayout } from '../src/engine/layout';
import { DEFAULT_CONSTRAINTS, PRESET_TEXTS } from '../src/engine/presets';
import { loadState, saveState, STORAGE_KEY, type StorageLike } from '../src/state/persistence';
import { initWorkbench, persistedOf, reducer } from '../src/state/store';
import { measurer } from './helpers';

function memStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const editTagline = (text: string) =>
  ({ type: 'SET_TEXT', blockId: 'tagline', language: 'zh', version: 'base', text }) as const;

describe('历史与恢复', () => {
  it('初始状态为内置预设（无存储时）', () => {
    const s = initWorkbench();
    expect(s.texts).toEqual(PRESET_TEXTS);
    expect(s.constraints).toEqual(DEFAULT_CONSTRAINTS);
    expect(s.past).toEqual([]);
    expect(s.future).toEqual([]);
  });

  it('连续编辑同一区块合并为一步历史', () => {
    let s = initWorkbench();
    s = reducer(s, editTagline('新标语 A'));
    s = reducer(s, editTagline('新标语 AB'));
    expect(s.past.length).toBe(1);
    expect(s.texts.tagline.zh.base).toBe('新标语 AB');
  });

  it('撤销/重做恢复文案', () => {
    let s = initWorkbench();
    s = reducer(s, editTagline('改后的标语'));
    s = reducer(s, {
      type: 'SET_TEXT',
      blockId: 'warning',
      language: 'zh',
      version: 'base',
      text: '改后的警示',
    });
    expect(s.past.length).toBe(2);

    s = reducer(s, { type: 'UNDO' });
    expect(s.texts.warning.zh.base).toBe(PRESET_TEXTS.warning.zh.base);
    expect(s.texts.tagline.zh.base).toBe('改后的标语');

    s = reducer(s, { type: 'UNDO' });
    expect(s.texts.tagline.zh.base).toBe(PRESET_TEXTS.tagline.zh.base);

    s = reducer(s, { type: 'REDO' });
    s = reducer(s, { type: 'REDO' });
    expect(s.texts.warning.zh.base).toBe('改后的警示');
  });

  it('撤销后再编辑清空 future', () => {
    let s = initWorkbench();
    s = reducer(s, editTagline('A'));
    s = reducer(s, { type: 'UNDO' });
    s = reducer(s, editTagline('B'));
    expect(s.future).toEqual([]);
    expect(reducer(s, { type: 'REDO' })).toEqual(s);
  });

  it('约束修改可撤销', () => {
    let s = initWorkbench();
    s = reducer(s, {
      type: 'SET_CONSTRAINTS',
      constraints: { ...s.constraints, minFontSizePt: 8 },
    });
    expect(s.constraints.minFontSizePt).toBe(8);
    s = reducer(s, { type: 'UNDO' });
    expect(s.constraints.minFontSizePt).toBe(DEFAULT_CONSTRAINTS.minFontSizePt);
  });

  it('一键重置恢复预设并清空历史', () => {
    let s = initWorkbench();
    s = reducer(s, editTagline('X'));
    s = reducer(s, { type: 'RESET' });
    expect(s.texts).toEqual(PRESET_TEXTS);
    expect(s.constraints).toEqual(DEFAULT_CONSTRAINTS);
    expect(s.past).toEqual([]);
    expect(s.future).toEqual([]);
  });

  it('切换语言/版本/对比不产生历史', () => {
    let s = initWorkbench();
    s = reducer(s, { type: 'SET_LANGUAGE', language: 'de' });
    s = reducer(s, { type: 'SET_VERSION', version: 'nordic' });
    s = reducer(s, { type: 'TOGGLE_COMPARE' });
    expect(s.past).toEqual([]);
    expect(s.language).toBe('de');
    expect(s.version).toBe('nordic');
    expect(s.compareMode).toBe(true);
  });

  it('保存后可从存储恢复，且排版结果一致（刷新恢复）', () => {
    const storage = memStorage();
    let s = initWorkbench();
    s = reducer(s, editTagline('刷新前编辑的标语'));
    s = reducer(s, { type: 'SET_LANGUAGE', language: 'en' });
    saveState(persistedOf(s), storage);

    const restored = loadState(storage);
    expect(restored).not.toBeNull();
    expect(restored!.texts.tagline.zh.base).toBe('刷新前编辑的标语');
    expect(restored!.language).toBe('en');

    const live = computeLayout(
      { texts: s.texts, constraints: s.constraints, language: 'en', version: 'base' },
      measurer,
    );
    const fromRestored = computeLayout(
      {
        texts: restored!.texts,
        constraints: restored!.constraints,
        language: restored!.language,
        version: restored!.version,
      },
      measurer,
    );
    expect(fromRestored).toEqual(live);
  });

  it('损坏的存储内容回退到预设', () => {
    const storage = memStorage();
    storage.setItem(STORAGE_KEY, '{oops');
    expect(loadState(storage)).toBeNull();
  });

  it('非法约束在恢复时被修正', () => {
    const storage = memStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        texts: PRESET_TEXTS,
        constraints: {
          allowedFonts: ['不存在的字体'],
          minFontSizePt: 18,
          maxFontSizePt: 6,
          minLineHeight: 0.2,
          maxLineHeight: 9,
        },
        language: 'xx',
        version: 'yy',
      }),
    );
    const restored = loadState(storage)!;
    expect(restored.constraints.allowedFonts).toEqual(DEFAULT_CONSTRAINTS.allowedFonts);
    expect(restored.constraints.minFontSizePt).toBeLessThanOrEqual(
      restored.constraints.maxFontSizePt,
    );
    expect(restored.constraints.minLineHeight).toBeGreaterThanOrEqual(1);
    expect(restored.language).toBe('zh');
    expect(restored.version).toBe('base');
  });
});
