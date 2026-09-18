import { describe, expect, it } from 'vitest';
import { validateReadingOrder, type ResolvedBlock } from '../src/engine/layout';
import { BLOCKS, PANELS } from '../src/engine/presets';
import { layoutFor } from './helpers';

const back = PANELS.find((p) => p.id === 'back')!;

function resolvedBlocks(regionByBlock: Record<string, string>): ResolvedBlock[] {
  return BLOCKS.filter((b) => b.panelId === 'back').map((b) => ({
    id: b.id,
    label: b.label,
    order: b.order,
    atomic: b.atomic,
    panelId: b.panelId,
    regionId: regionByBlock[b.id] ?? b.regionId,
    text: 'x',
  }));
}

function groupByRegion(blocks: ResolvedBlock[]): Map<string, ResolvedBlock[]> {
  const map = new Map<string, ResolvedBlock[]>();
  for (const r of back.regions) map.set(r.id, []);
  for (const b of blocks) map.get(b.regionId)!.push(b);
  for (const list of map.values()) list.sort((a, b) => a.order - b.order);
  return map;
}

describe('阅读顺序', () => {
  it('区域位置与规定顺序一致时不报违规', () => {
    const blocks = resolvedBlocks({});
    expect(validateReadingOrder(back, groupByRegion(blocks), blocks)).toBeNull();
  });

  it('强制声明被挪到储存说明之后时报 ORDER，并指出冲突双方', () => {
    const blocks = resolvedBlocks({ declaration: 'cert-zone' });
    const v = validateReadingOrder(back, groupByRegion(blocks), blocks);
    expect(v).not.toBeNull();
    expect(v!.kind).toBe('ORDER');
    expect(v!.blockId).toBe('declaration'); // 应该在前却排到后面的区块
    expect(v!.relatedBlockId).toBe('storage'); // 实际先读到的区块
    expect(v!.message).toContain('强制声明');
    expect(v!.message).toContain('储存说明');
  });

  it('预设：基准版三语均无顺序问题', () => {
    for (const lang of ['zh', 'en', 'de'] as const) {
      expect(layoutFor(lang, 'base').violations.filter((v) => v.kind === 'ORDER')).toEqual([]);
    }
  });

  it('预设：北欧改版德语背面报 ORDER（声明被挪到认证区）', () => {
    const v = layoutFor('de', 'nordic').violations.find((x) => x.kind === 'ORDER');
    expect(v).toBeDefined();
    expect(v!.panelId).toBe('back');
    expect(v!.blockId).toBe('declaration');
  });
});
