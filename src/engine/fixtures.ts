import type {
  CopyBlock,
  CopyVersion,
  Panel,
  PanelId,
  ProductSpec,
  Rect,
  Zone,
  ZoneConstraints,
} from '../types';

/** 测试用约束：6/8/10pt 三档字号，行距固定 1.0 */
export const TEST_CONSTRAINTS: ZoneConstraints = {
  allowedFontIds: ['sans'],
  fontSizePt: { min: 6, max: 10, step: 2 },
  lineHeight: { min: 1, max: 1, step: 0.05 },
};

export function makeZone(
  id: string,
  panelId: PanelId,
  rect: Rect,
  constraints: ZoneConstraints = TEST_CONSTRAINTS,
): Zone {
  return { id, panelId, name: `${id}区`, rect, paddingMm: 2, defaultConstraints: constraints };
}

export function makeBlock(
  id: string,
  zoneId: string,
  order: number,
  text: string,
  kind: CopyBlock['kind'] = 'normal',
): CopyBlock {
  return { id, zoneId, label: id, kind, readingOrder: order, text };
}

export function makeSpec(zones: Zone[], blocks: CopyBlock[]): ProductSpec {
  const panelIds = [...new Set(zones.map((z) => z.panelId))];
  const panels: Panel[] = panelIds.map((id) => ({
    id,
    name: id,
    widthMm: 120,
    heightMm: 80,
    zones: zones.filter((z) => z.panelId === id),
  }));
  const version: CopyVersion = {
    id: 'v1',
    name: 'v1',
    note: '',
    copy: { zh: blocks, en: blocks, de: blocks },
  };
  return {
    fonts: [
      { id: 'sans', label: 'sans', cssFamily: 'sans-serif' },
      { id: 'wide', label: 'wide', cssFamily: 'sans-serif' },
      { id: 'narrow', label: 'narrow', cssFamily: 'sans-serif' },
    ],
    panels,
    versions: [version],
  };
}

export function constraintsOf(spec: ProductSpec): Record<string, ZoneConstraints> {
  const result: Record<string, ZoneConstraints> = {};
  for (const p of spec.panels) {
    for (const z of p.zones) {
      result[z.id] = JSON.parse(JSON.stringify(z.defaultConstraints)) as ZoneConstraints;
    }
  }
  return result;
}
