import type { FontDef } from './types';

/** 1pt = 25.4/72 mm */
export const PT_TO_MM = 25.4 / 72;

/** 文本宽度测量器：输入文本、字体、字号（pt），返回宽度（mm） */
export interface Measurer {
  measure(text: string, fontId: string, sizePt: number): number;
}

function isCjkCodePoint(code: number): boolean {
  return (
    (code >= 0x2e80 && code <= 0x2fdf) ||
    (code >= 0x3000 && code <= 0x303f) || // CJK 标点
    (code >= 0x3040 && code <= 0x30ff) || // 假名
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef) // 全角字符
  );
}

/** 表格测量器的字符宽度（以 em 为单位），确定性、与平台无关 */
function charWidthEm(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (ch === ' ') return 0.32;
  if (isCjkCodePoint(code)) return 1;
  if ('iljtfI.,:;\'"!|()[]/'.includes(ch)) return 0.3;
  if ('mwMW@#%&'.includes(ch)) return 0.9;
  if (ch >= '0' && ch <= '9') return 0.56;
  if (code < 0x2000) return 0.52; // 拉丁字母（含 ä ö ü ß 等）
  return 0.6;
}

/**
 * 确定性表格测量器：不依赖浏览器与系统字体，纯查表计算。
 * 用于单元测试与任何无 canvas 的环境；同一输入永远得到同一结果。
 */
export function createTableMeasurer(fonts: FontDef[]): Measurer {
  const factor = new Map(fonts.map((f) => [f.id, f.widthFactor]));
  return {
    measure(text, fontId, sizePt) {
      const em = sizePt * PT_TO_MM * (factor.get(fontId) ?? 1);
      let units = 0;
      for (const ch of text) units += charWidthEm(ch);
      return units * em;
    },
  };
}

/**
 * 浏览器 canvas 测量器：用与渲染完全相同的字体栈做真实测量（结果带缓存）。
 * 仅在浏览器环境可用。
 */
export function createCanvasMeasurer(fonts: FontDef[]): Measurer {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前环境不支持 canvas 2d，无法测量文字');
  const family = new Map(fonts.map((f) => [f.id, f.cssFamily]));
  const cache = new Map<string, number>();
  return {
    measure(text, fontId, sizePt) {
      const key = `${fontId}|${sizePt}|${text}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      ctx.font = `${sizePt}pt ${family.get(fontId) ?? fontId}`;
      const px = ctx.measureText(text).width;
      const mm = (px * 25.4) / 96; // CSS px → mm（1px = 1/96in）
      cache.set(key, mm);
      return mm;
    },
  };
}
