import { describe, expect, it } from 'vitest';
import { defaultConstraints, productSpec } from '../data/product';
import { layoutProduct } from '../engine/layout';
import { MockMeasurer } from '../engine/measurer';
import {
  applyAction,
  commit,
  createInitialState,
  deserializeWorkspace,
  initHistory,
  redoHistory,
  serializeWorkspace,
  undoHistory,
} from '../state/store';

const measurer = new MockMeasurer();

function editLegal(text: string) {
  return {
    type: 'edit-copy' as const,
    versionId: 'v1-current',
    language: 'zh' as const,
    blockId: 'legal',
    text,
  };
}

function legalText(state: ReturnType<typeof createInitialState>): string {
  const v = state.versions.find((v) => v.id === 'v1-current')!;
  return v.copy.zh.find((b) => b.id === 'legal')!.text;
}

describe('撤销 / 重做', () => {
  it('提交修改后可撤销、可重做', () => {
    let h = initHistory(createInitialState());
    const original = legalText(h.present);

    h = commit(h, editLegal('改过的警示语'), 'copy:legal');
    expect(legalText(h.present)).toBe('改过的警示语');
    expect(h.past).toHaveLength(1);

    h = undoHistory(h);
    expect(legalText(h.present)).toBe(original);
    expect(h.future).toHaveLength(1);

    h = redoHistory(h);
    expect(legalText(h.present)).toBe('改过的警示语');
  });

  it('相同合并键的连续编辑算一步（逐字输入不刷屏历史）', () => {
    let h = initHistory(createInitialState());
    const original = legalText(h.present);
    h = commit(h, editLegal('警'), 'copy:legal');
    h = commit(h, editLegal('警示'), 'copy:legal');
    h = commit(h, editLegal('警示语'), 'copy:legal');
    expect(h.past).toHaveLength(1);
    h = undoHistory(h);
    expect(legalText(h.present)).toBe(original);
  });

  it('不同合并键的编辑各自成步', () => {
    let h = initHistory(createInitialState());
    h = commit(h, editLegal('第一步'), 'copy:legal');
    h = commit(h, { type: 'set-language', language: 'en' });
    expect(h.past).toHaveLength(2);
    h = undoHistory(h);
    expect(h.present.language).toBe('zh');
    h = undoHistory(h);
    expect(legalText(h.present)).not.toBe('第一步');
  });

  it('无实际变化的动作不产生历史', () => {
    let h = initHistory(createInitialState());
    h = commit(h, { type: 'set-language', language: 'zh' });
    expect(h.past).toHaveLength(0);
  });

  it('切换到与对比基准相同的版本时自动关闭对比', () => {
    const s0 = { ...createInitialState(), compareWith: 'v2-nordic' };
    const s1 = applyAction(s0, { type: 'set-version', versionId: 'v2-nordic' });
    expect(s1.versionId).toBe('v2-nordic');
    expect(s1.compareWith).toBeNull();
  });
});

describe('历史恢复（刷新后从存档还原）', () => {
  it('序列化 → 反序列化：状态完全一致，重算结果也一致', () => {
    let h = initHistory(createInitialState());
    h = commit(h, editLegal('自定义警示语：含坚果。'), 'copy:legal');
    h = commit(h, { type: 'set-language', language: 'de' });
    h = commit(h, { type: 'set-version', versionId: 'v2-nordic' });

    const restored = deserializeWorkspace(serializeWorkspace(h.present));
    expect(restored).toEqual(h.present);

    const version = restored!.versions.find((v) => v.id === restored!.versionId)!;
    const a = layoutProduct(productSpec, restored!.constraints, version, restored!.language, measurer);
    const b = layoutProduct(
      productSpec,
      h.present.constraints,
      h.present.versions.find((v) => v.id === h.present.versionId)!,
      h.present.language,
      measurer,
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('损坏或结构不符的存档返回 null（回退初始状态）', () => {
    expect(deserializeWorkspace('{not json')).toBeNull();
    expect(deserializeWorkspace(JSON.stringify({ dataVersion: 999 }))).toBeNull();
    expect(deserializeWorkspace(JSON.stringify({ ...createInitialState(), language: 'fr' }))).toBeNull();
    expect(deserializeWorkspace(JSON.stringify({ ...createInitialState(), versionId: 'nope' }))).toBeNull();
  });

  it('初始状态确定性：两次创建完全一致', () => {
    expect(createInitialState()).toEqual(createInitialState());
    expect(defaultConstraints(productSpec)).toEqual(defaultConstraints(productSpec));
  });
});
