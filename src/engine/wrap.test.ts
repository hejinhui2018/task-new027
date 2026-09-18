import { describe, expect, it } from 'vitest';
import { MockMeasurer, PT_TO_MM } from '../engine/measurer';
import { tokenize, wrapText } from '../engine/wrap';

const measurer = new MockMeasurer();
/** 取 1em == 1mm 的字号，方便手算期望宽度 */
const SIZE = 1 / PT_TO_MM;
const FONT = 'sans';

describe('tokenize 分词', () => {
  it('拉丁词以空格分隔，词首原子标记 spaceBefore', () => {
    expect(tokenize('High in fibre')).toEqual([
      { text: 'High', spaceBefore: false },
      { text: 'in', spaceBefore: true },
      { text: 'fibre', spaceBefore: true },
    ]);
  });

  it('拉丁词允许在显式连字符后断开', () => {
    expect(tokenize('Beeren-Haferriegel')).toEqual([
      { text: 'Beeren-', spaceBefore: false },
      { text: 'Haferriegel', spaceBefore: false },
    ]);
  });

  it('CJK 逐字成原子且无需空格', () => {
    expect(tokenize('高纤维')).toEqual([
      { text: '高', spaceBefore: false },
      { text: '纤', spaceBefore: false },
      { text: '维', spaceBefore: false },
    ]);
  });

  it('中英混排：CJK 逐字、拉丁成词、交界处不加空格', () => {
    expect(tokenize('含麸质Getreide谷物')).toEqual([
      { text: '含', spaceBefore: false },
      { text: '麸', spaceBefore: false },
      { text: '质', spaceBefore: false },
      { text: 'Getreide', spaceBefore: false },
      { text: '谷', spaceBefore: false },
      { text: '物', spaceBefore: false },
    ]);
  });
});

describe('wrapText 换行测量', () => {
  it('贪心装行：装不下就换行（a=0.5mm，空格=0.3mm）', () => {
    const r = wrapText('aaaa bbbb cccc', 4.5, FONT, SIZE, measurer);
    expect(r.lines).toEqual(['aaaa bbbb', 'cccc']);
    expect(r.lineWidthsMm[0]).toBeCloseTo(4.3, 5);
    expect(r.unbreakable).toEqual([]);
  });

  it('CJK 按字断行（每字 1mm）', () => {
    const r = wrapText('高膳食纤维素', 2.5, FONT, SIZE, measurer);
    expect(r.lines).toEqual(['高膳', '食纤', '维素']);
  });

  it('超长单词不硬拆：记入 unbreakable 并独占一行', () => {
    const r = wrapText('aaaaaaaaaa rest', 3, FONT, SIZE, measurer);
    expect(r.lines[0]).toBe('aaaaaaaaaa');
    expect(r.unbreakable).toEqual([{ token: 'aaaaaaaaaa', widthMm: 5 }]);
  });

  it('连字符复合词可以在连字符后断行', () => {
    const r = wrapText('aa-bb cc', 1.5, FONT, SIZE, measurer);
    expect(r.lines).toEqual(['aa-', 'bb', 'cc']);
    expect(r.unbreakable).toEqual([]);
  });

  it('显式换行与空段：空段保留为空行', () => {
    const r = wrapText('ab\n\ncd', 10, FONT, SIZE, measurer);
    expect(r.lines).toEqual(['ab', '', 'cd']);
  });

  it('同一输入重复计算结果一致（确定性）', () => {
    const text = 'Nordischer Beeren-Haferriegel 高膳食纤维 Kühllagerung';
    const a = wrapText(text, 12, FONT, 8, measurer);
    const b = wrapText(text, 12, FONT, 8, measurer);
    expect(a).toEqual(b);
  });
});
