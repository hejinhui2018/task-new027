import type { CopyBlock, Panel, ProductSpec, ZoneConstraints } from '../types';

/**
 * 内置产品：NordBerry 北欧莓果燕麦能量棒。
 * 三个面板按真实毫米尺寸定义；每个区域给出默认排版约束（可在工作台中调整）。
 *
 * 内置一次「北欧上市改版」（v2-nordic）：
 *  - 德语：更换了更长的强制警示声明（不可拆分，声明区放不下）；
 *          储存条件中出现超长德语复合词（越出区域边界）。
 *  - 英语：正面卖点声明大幅加长（溢出）；
 *          新增的北欧处置说明被放进了面板顶部区域，阅读顺序错误。
 *  - 中文：改版后依然全部放得下，用于对照。
 */

const fonts: ProductSpec['fonts'] = [
  { id: 'sans', label: 'Helvetica / Arial', cssFamily: "Helvetica, Arial, 'Segoe UI', sans-serif" },
  { id: 'serif', label: 'Georgia / Times', cssFamily: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', label: 'Courier（等宽）', cssFamily: "'Courier New', Courier, monospace" },
];

function constraints(
  allowedFontIds: string[],
  sizeMin: number,
  sizeMax: number,
  lhMin: number,
  lhMax: number,
): ZoneConstraints {
  return {
    allowedFontIds,
    fontSizePt: { min: sizeMin, max: sizeMax, step: 0.5 },
    lineHeight: { min: lhMin, max: lhMax, step: 0.05 },
  };
}

const panels: Panel[] = [
  {
    id: 'front',
    name: '正面',
    widthMm: 120,
    heightMm: 80,
    zones: [
      { id: 'brand', panelId: 'front', name: '品牌区', rect: { x: 8, y: 8, w: 104, h: 12 }, paddingMm: 2, defaultConstraints: constraints(['sans', 'serif'], 12, 18, 1.0, 1.3) },
      { id: 'name', panelId: 'front', name: '品名区', rect: { x: 8, y: 24, w: 104, h: 14 }, paddingMm: 2, defaultConstraints: constraints(['sans', 'serif'], 10, 16, 1.0, 1.3) },
      { id: 'claims', panelId: 'front', name: '卖点区', rect: { x: 8, y: 42, w: 104, h: 12 }, paddingMm: 2, defaultConstraints: constraints(['sans'], 8, 11, 1.1, 1.4) },
      { id: 'netweight', panelId: 'front', name: '净含量区', rect: { x: 8, y: 58, w: 104, h: 8 }, paddingMm: 2, defaultConstraints: constraints(['sans', 'mono'], 7, 9, 1.0, 1.2) },
    ],
  },
  {
    id: 'side',
    name: '侧面',
    widthMm: 40,
    heightMm: 80,
    zones: [
      { id: 'nutrition', panelId: 'side', name: '营养区', rect: { x: 4, y: 6, w: 32, h: 40 }, paddingMm: 2, defaultConstraints: constraints(['sans'], 5, 7, 1.1, 1.3) },
      { id: 'storage', panelId: 'side', name: '储存区', rect: { x: 4, y: 50, w: 32, h: 24 }, paddingMm: 2, defaultConstraints: constraints(['sans', 'serif'], 6, 8, 1.1, 1.3) },
    ],
  },
  {
    id: 'back',
    name: '背面',
    widthMm: 120,
    heightMm: 80,
    zones: [
      { id: 'usage', panelId: 'back', name: '食用方法区', rect: { x: 8, y: 6, w: 104, h: 18 }, paddingMm: 2, defaultConstraints: constraints(['sans'], 8, 10, 1.1, 1.3) },
      { id: 'ingredients', panelId: 'back', name: '配料区', rect: { x: 8, y: 26, w: 104, h: 16 }, paddingMm: 2, defaultConstraints: constraints(['sans'], 7, 9, 1.1, 1.3) },
      { id: 'legal', panelId: 'back', name: '声明区', rect: { x: 8, y: 44, w: 104, h: 14 }, paddingMm: 2, defaultConstraints: constraints(['sans'], 6, 8, 1.1, 1.3) },
      { id: 'recycling', panelId: 'back', name: '回收区', rect: { x: 8, y: 62, w: 104, h: 8 }, paddingMm: 2, defaultConstraints: constraints(['sans', 'mono'], 7, 9, 1.0, 1.2) },
    ],
  },
];

interface BlockSeed {
  id: string;
  zoneId: string;
  label: string;
  kind?: CopyBlock['kind'];
  order: number;
}

const BLOCKS: BlockSeed[] = [
  { id: 'brand', zoneId: 'brand', label: '品牌标识', order: 1 },
  { id: 'name', zoneId: 'name', label: '产品名称', order: 2 },
  { id: 'claims', zoneId: 'claims', label: '卖点声明', order: 3 },
  { id: 'netweight', zoneId: 'netweight', label: '净含量', order: 4 },
  { id: 'nutrition', zoneId: 'nutrition', label: '营养信息', order: 1 },
  { id: 'storage', zoneId: 'storage', label: '储存条件', order: 2 },
  { id: 'usage', zoneId: 'usage', label: '食用方法', order: 1 },
  { id: 'ingredients', zoneId: 'ingredients', label: '配料表', order: 2 },
  { id: 'legal', zoneId: 'legal', label: '强制警示声明', kind: 'atomic', order: 3 },
  { id: 'recycling', zoneId: 'recycling', label: '回收提示', order: 4 },
  { id: 'disposal', zoneId: 'usage', label: '北欧处置说明', order: 5 },
];

function block(id: string, text: string): CopyBlock {
  const seed = BLOCKS.find((b) => b.id === id);
  if (!seed) throw new Error(`unknown block ${id}`);
  return {
    id: seed.id,
    zoneId: seed.zoneId,
    label: seed.label,
    kind: seed.kind ?? 'normal',
    readingOrder: seed.order,
    text,
  };
}

function copy(texts: Record<string, string>): CopyBlock[] {
  return Object.entries(texts).map(([id, text]) => block(id, text));
}

const zhV1 = copy({
  brand: 'NORDBERRY 诺德莓',
  name: '北欧莓果燕麦能量棒',
  claims: '高膳食纤维 · 无添加蔗糖',
  netweight: '净含量：45克',
  nutrition: '营养成分（每100克）：能量1650千焦，蛋白质8.2克，脂肪12.5克，碳水化合物58克，膳食纤维9克，钠120毫克。',
  storage: '请置于阴凉干燥处，避免阳光直射。',
  usage: '食用方法：开袋即食，运动后补充能量更佳。',
  ingredients: '配料：燕麦片、枣泥、蓝莓干、蔓越莓干、葵花籽油、食用盐。',
  legal: '警示：本品含麸质谷物，可能含微量坚果。生产许可证编号：SC10600000000000。保质期：12个月。',
  recycling: '请将包装投入可回收垃圾桶。',
});

const zhV2 = copy({
  brand: 'NORDBERRY 诺德莓',
  name: '北欧莓果燕麦能量棒',
  claims: '高膳食纤维 · 无添加蔗糖 · 北欧天鹅生态标签认证',
  netweight: '净含量：45克',
  nutrition: '营养成分（每100克）：能量1650千焦，蛋白质8.2克，脂肪12.5克，碳水化合物58克，膳食纤维9克，钠120毫克。',
  storage: '请置于阴凉干燥处，冷藏温度请保持在4至8摄氏度。',
  usage: '食用方法：开袋即食，运动后补充能量更佳。',
  ingredients: '配料：燕麦片、枣泥、蓝莓干、蔓越莓干、葵花籽油、食用盐。',
  legal: '警示：本品含麸质谷物，可能含微量坚果与花生。生产许可证编号：SC10600000000000。保质期：12个月。进口商：北欧食品（上海）有限公司。',
  recycling: '请将内膜与纸套分离后分别回收。',
});

const enV1 = copy({
  brand: 'NORDBERRY',
  name: 'Nordic Berry Oat Bar',
  claims: 'High in fibre • No added sugar',
  netweight: 'Net weight: 45 g',
  nutrition: 'Nutrition per 100 g: energy 1650 kJ, protein 8.2 g, fat 12.5 g, carbohydrate 58 g, fibre 9 g, sodium 120 mg.',
  storage: 'Store in a cool, dry place away from direct sunlight.',
  usage: 'Enjoy straight from the pack — ideal after exercise.',
  ingredients: 'Ingredients: rolled oats, date paste, dried blueberries, dried cranberries, sunflower oil, salt.',
  legal: 'Warning: contains gluten-containing cereals; may contain traces of nuts. Best before: see base. Keep out of reach of small children.',
  recycling: 'Recycle the wrapper as paper.',
});

const enV2 = copy({
  brand: 'NORDBERRY',
  name: 'Nordic Berry Oat Bar',
  claims:
    'High in fibre • No added sugar • Nordic Swan Ecolabel certified • 100% recyclable paper wrapper • 50% less plastic than our 2024 pack • Source of magnesium and iron • Suitable for vegans',
  netweight: 'Net weight: 45 g',
  nutrition: 'Nutrition per 100 g: energy 1650 kJ, protein 8.2 g, fat 12.5 g, carbohydrate 58 g, fibre 9 g, sodium 120 mg.',
  storage: 'Keep refrigerated at 4–8 °C once opened and consume within 3 days.',
  usage: 'Enjoy straight from the pack — ideal after exercise.',
  ingredients: 'Ingredients: rolled oats, date paste, dried blueberries, dried cranberries, sunflower oil, salt.',
  legal:
    'Warning: contains gluten-containing cereals; may contain traces of nuts and peanuts. Not suitable for children under 3 years. Best before: see base. Importer: NordBerry AB, Stockholm, Sweden.',
  recycling: 'Recycle the wrapper as paper.',
  // 北欧新规新增的处置说明，被放进了面板顶部的食用方法区（阅读顺序应为最后）
  disposal: 'Nordic disposal: separate the inner film from the paper sleeve before recycling.',
});

const deV1 = copy({
  brand: 'NORDBERRY',
  name: 'Nordischer Beeren-Haferriegel',
  claims: 'Ballaststoffreich • Ohne Zuckerzusatz',
  netweight: 'Nettogewicht: 45 g',
  nutrition: 'Nährwerte pro 100 g: Energie 1650 kJ, Eiweiß 8,2 g, Fett 12,5 g, Kohlenhydrate 58 g, Ballaststoffe 9 g, Natrium 120 mg.',
  storage: 'Kühl und trocken lagern, vor direkter Sonneneinstrahlung schützen.',
  usage: 'Direkt verzehrfertig – ideal nach dem Sport.',
  ingredients: 'Zutaten: Haferflocken, Dattelpüree, getrocknete Blaubeeren, getrocknete Cranberries, Sonnenblumenöl, Salz.',
  legal: 'Warnhinweis: Enthält glutenhaltiges Getreide. Kann Spuren von Nüssen enthalten. Mindestens haltbar bis: siehe Boden.',
  recycling: 'Verpackung der Papiersammlung zuführen.',
});

const deV2 = copy({
  brand: 'NORDBERRY',
  name: 'Nordischer Beeren-Haferriegel',
  claims: 'Ballaststoffreich • Ohne Zuckerzusatz • Nordischer Schwan Umweltzeichen',
  netweight: 'Nettogewicht: 45 g',
  nutrition: 'Nährwerte pro 100 g: Energie 1650 kJ, Eiweiß 8,2 g, Fett 12,5 g, Kohlenhydrate 58 g, Ballaststoffe 9 g, Natrium 120 mg.',
  // 新版储存说明引入了超长德语复合词，窄储存区放不下
  storage: 'Vor Feuchtigkeit schützen. Kühllagerungstemperaturgrenzwerte beachten: 4–8 °C einhalten.',
  usage: 'Direkt verzehrfertig – ideal nach dem Sport.',
  ingredients: 'Zutaten: Haferflocken, Dattelpüree, getrocknete Blaubeeren, getrocknete Cranberries, Sonnenblumenöl, Salz.',
  // 北欧强制声明全文，必须作为不可拆分整体放入声明区
  legal:
    'Pflichtangaben: Enthält glutenhaltiges Getreide. Kann Spuren von Schalenfrüchten, Erdnüssen, Sesam und Soja enthalten. Nicht geeignet für Kinder unter 3 Jahren. Kühl und trocken bei 4 bis 8 °C lagern und vor direkter Sonneneinstrahlung schützen. Mindestens haltbar bis: siehe Bodenprägung. Inverkehrbringer: NordBerry AB, Kungsgatan 12, 111 35 Stockholm, Schweden. Ursprungsland: Finnland. Nach dem Öffnen innerhalb von 3 Tagen verzehren. Innenfolie und Papiermantel sind getrennt zu entsorgen.',
  recycling: 'Verpackung der Papiersammlung zuführen.',
});

export const productSpec: ProductSpec = {
  fonts,
  panels,
  versions: [
    {
      id: 'v1-current',
      name: 'v1.3 现行版',
      note: '当前在售版本的包装文案。',
      copy: { zh: zhV1, en: enV1, de: deV1 },
    },
    {
      id: 'v2-nordic',
      name: 'v2.0 北欧上市改版',
      note: '德语更换强制警示声明；英语新增环保卖点与北欧处置说明。',
      copy: { zh: zhV2, en: enV2, de: deV2 },
    },
  ],
};

/** 所有区域的默认约束表（zoneId → constraints），用于初始化工作台状态 */
export function defaultConstraints(spec: ProductSpec): Record<string, ZoneConstraints> {
  const result: Record<string, ZoneConstraints> = {};
  for (const panel of spec.panels) {
    for (const zone of panel.zones) {
      result[zone.id] = JSON.parse(JSON.stringify(zone.defaultConstraints)) as ZoneConstraints;
    }
  }
  return result;
}
