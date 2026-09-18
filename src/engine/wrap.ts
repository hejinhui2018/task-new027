import type { Measurer } from './measurer';

/** 毫米比较误差容忍 */
export const EPS_MM = 0.01;

/** 可断行原子：拉丁词（连字符后可断）、CJK 单字（任意处可断） */
export interface Atom {
  text: string;
  /** 前面是否需要空格（仅每个拉丁词的第一个原子为 true） */
  spaceBefore: boolean;
}

const CJK_RE = /[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/;

/**
 * 把一段文字切成可断行原子：
 *  - 空白分词；连续拉丁字符为一个词，词内仅允许在显式连字符 "-" 后断开；
 *  - CJK 字符逐字成原子，字间无需空格；
 *  - 拉丁词内部不允许断行（放不下整个词时记为 unbreakable，越界而非硬拆）。
 */
export function tokenize(paragraph: string): Atom[] {
  const atoms: Atom[] = [];
  const words = paragraph.trim().split(/\s+/).filter((w) => w.length > 0);
  let firstOverall = true;
  for (const word of words) {
    let firstInWord = true;
    const push = (text: string) => {
      atoms.push({ text, spaceBefore: !firstOverall && firstInWord });
      firstInWord = false;
      firstOverall = false;
    };
    let latinRun = '';
    const flushLatin = () => {
      if (!latinRun) return;
      // 在连字符后切开，保留连字符在前半部分
      const parts = latinRun.split(/(?<=-)/).filter((p) => p.length > 0);
      for (const p of parts) push(p);
      latinRun = '';
    };
    for (const ch of word) {
      if (CJK_RE.test(ch)) {
        flushLatin();
        push(ch);
      } else {
        latinRun += ch;
      }
    }
    flushLatin();
  }
  return atoms;
}

export interface WrapResult {
  lines: string[];
  lineWidthsMm: number[];
  /** 单个原子超过行宽、无法断行的词（会越出区域边界） */
  unbreakable: { token: string; widthMm: number }[];
}

/**
 * 贪心换行：按原子顺序装行，装不下就换行。
 * 显式换行符 "\n" 强制分段；空段保留为一个空行。
 * 同一个词若单行都放不下，不硬拆，记入 unbreakable 并独占一行（渲染时越界）。
 */
export function wrapText(
  text: string,
  maxWidthMm: number,
  fontId: string,
  sizePt: number,
  measurer: Measurer,
): WrapResult {
  const lines: string[] = [];
  const lineWidthsMm: number[] = [];
  const unbreakable: { token: string; widthMm: number }[] = [];

  for (const rawParagraph of text.split('\n')) {
    const atoms = tokenize(rawParagraph);
    if (atoms.length === 0) {
      lines.push('');
      lineWidthsMm.push(0);
      continue;
    }
    let current = '';
    const flush = () => {
      lines.push(current);
      lineWidthsMm.push(measurer.measure(current, fontId, sizePt));
    };
    for (const atom of atoms) {
      const candidate =
        current === '' ? atom.text : atom.spaceBefore ? `${current} ${atom.text}` : current + atom.text;
      if (current !== '' && measurer.measure(candidate, fontId, sizePt) > maxWidthMm + EPS_MM) {
        flush();
        const atomWidth = measurer.measure(atom.text, fontId, sizePt);
        if (atomWidth > maxWidthMm + EPS_MM) {
          unbreakable.push({ token: atom.text, widthMm: atomWidth });
        }
        current = atom.text;
      } else {
        if (current === '' && measurer.measure(atom.text, fontId, sizePt) > maxWidthMm + EPS_MM) {
          unbreakable.push({ token: atom.text, widthMm: measurer.measure(atom.text, fontId, sizePt) });
        }
        current = candidate;
      }
    }
    flush();
  }
  return { lines, lineWidthsMm, unbreakable };
}
