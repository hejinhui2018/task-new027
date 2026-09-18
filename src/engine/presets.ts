import type {
  BlockDef,
  Constraints,
  FontDef,
  Language,
  PanelDef,
  TextsMap,
  VersionId,
} from './types';

/** 可选字体：全部使用系统字体栈，保证离线可用、测量与渲染一致 */
export const FONTS: FontDef[] = [
  {
    id: 'sans',
    label: '无衬线 Sans',
    cssFamily:
      '"Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
    widthFactor: 1,
  },
  {
    id: 'serif',
    label: '衬线 Serif',
    cssFamily: 'Georgia, "Times New Roman", "Songti SC", SimSun, serif',
    widthFactor: 1.04,
  },
  {
    id: 'mono',
    label: '等宽 Mono',
    cssFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
    widthFactor: 1.15,
  },
];

export const DEFAULT_CONSTRAINTS: Constraints = {
  allowedFonts: ['sans', 'serif', 'mono'],
  minFontSizePt: 6,
  maxFontSizePt: 12,
  minLineHeight: 1.15,
  maxLineHeight: 1.5,
};

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

export const VERSIONS: { id: VersionId; label: string }[] = [
  { id: 'base', label: '基准版 v1.0' },
  { id: 'nordic', label: '北欧上市改版' },
];

/** 三个面版的真实毫米区域（区域顺序 = 阅读空间顺序） */
export const PANELS: PanelDef[] = [
  {
    id: 'front',
    label: '正面',
    widthMm: 120,
    heightMm: 80,
    regions: [
      { id: 'brand-zone', label: '品牌区', xMm: 0, yMm: 0, widthMm: 120, heightMm: 16 },
      { id: 'name-zone', label: '品名区', xMm: 0, yMm: 16, widthMm: 120, heightMm: 24 },
      { id: 'tagline-zone', label: '标语区', xMm: 0, yMm: 40, widthMm: 60, heightMm: 7 },
      { id: 'hero-zone', label: '主图区', xMm: 60, yMm: 40, widthMm: 60, heightMm: 40 },
      { id: 'foot-zone', label: '底部留白区', xMm: 0, yMm: 47, widthMm: 60, heightMm: 33 },
    ],
  },
  {
    id: 'side',
    label: '侧面',
    widthMm: 40,
    heightMm: 80,
    regions: [
      { id: 'nutrition-zone', label: '营养提示区', xMm: 0, yMm: 0, widthMm: 40, heightMm: 34 },
      { id: 'contact-zone', label: '联系信息区', xMm: 0, yMm: 34, widthMm: 40, heightMm: 46 },
    ],
  },
  {
    id: 'back',
    label: '背面',
    widthMm: 120,
    heightMm: 80,
    regions: [
      { id: 'ingredients-zone', label: '配料区', xMm: 0, yMm: 0, widthMm: 120, heightMm: 24 },
      { id: 'warning-zone', label: '警示语区', xMm: 0, yMm: 24, widthMm: 120, heightMm: 7 },
      { id: 'legal-zone', label: '声明区', xMm: 0, yMm: 31, widthMm: 120, heightMm: 18 },
      { id: 'recycling-zone', label: '回收说明区', xMm: 0, yMm: 49, widthMm: 120, heightMm: 10 },
      { id: 'cert-zone', label: '认证区', xMm: 0, yMm: 59, widthMm: 120, heightMm: 4.5 },
      { id: 'barcode-zone', label: '条码区', xMm: 0, yMm: 63.5, widthMm: 120, heightMm: 16.5 },
    ],
  },
];

export const PANEL_BY_ID: Record<string, PanelDef> = Object.fromEntries(
  PANELS.map((p) => [p.id, p]),
);

export const REGION_BY_ID: Record<string, { id: string; label: string } & PanelDef['regions'][number]> =
  Object.fromEntries(PANELS.flatMap((p) => p.regions.map((r) => [r.id, r])));

/** 文案区块：order 为规定阅读顺序；declaration 是不可拆分的强制声明 */
export const BLOCKS: BlockDef[] = [
  { id: 'brand', label: '品牌', panelId: 'front', order: 1, atomic: false, regionId: 'brand-zone' },
  { id: 'productName', label: '品名', panelId: 'front', order: 2, atomic: false, regionId: 'name-zone' },
  { id: 'tagline', label: '标语', panelId: 'front', order: 3, atomic: false, regionId: 'tagline-zone' },
  { id: 'nutrition', label: '营养提示', panelId: 'side', order: 1, atomic: false, regionId: 'nutrition-zone' },
  { id: 'contact', label: '联系信息', panelId: 'side', order: 2, atomic: false, regionId: 'contact-zone' },
  { id: 'ingredients', label: '配料表', panelId: 'back', order: 1, atomic: false, regionId: 'ingredients-zone' },
  { id: 'warning', label: '警示语', panelId: 'back', order: 2, atomic: false, regionId: 'warning-zone' },
  {
    id: 'declaration',
    label: '强制声明',
    panelId: 'back',
    order: 3,
    atomic: true,
    regionId: 'legal-zone',
    // 北欧改版时，德语编辑把放不下的声明挪到了认证区（顺序被打乱、区域放不下）
    regionOverrides: { de: { nordic: 'cert-zone' } },
  },
  { id: 'storage', label: '储存说明', panelId: 'back', order: 4, atomic: false, regionId: 'legal-zone' },
  { id: 'recycling', label: '回收说明', panelId: 'back', order: 5, atomic: false, regionId: 'recycling-zone' },
];

export const BLOCK_BY_ID: Record<string, BlockDef> = Object.fromEntries(
  BLOCKS.map((b) => [b.id, b]),
);

/** 基准版 v1.0 文案 */
const BASE: Record<string, Record<Language, string>> = {
  brand: {
    zh: '极光食品 AURORA FOODS',
    en: 'AURORA FOODS',
    de: 'AURORA FOODS',
  },
  productName: {
    zh: '极光浆果燕麦棒',
    en: 'Aurora Berry Oat Bar',
    de: 'Aurora Beeren-Haferriegel',
  },
  tagline: {
    zh: '北欧风味 · 每日能量',
    en: 'Nordic taste · Everyday energy',
    de: 'Nordischer Geschmack',
  },
  nutrition: {
    zh: '每份 40g：能量 180kcal，蛋白质 3.2g，膳食纤维 2.1g',
    en: 'Per 40g: energy 180kcal, protein 3.2g, fibre 2.1g',
    de: 'Pro 40g: Energie 180kcal, Eiweiß 3,2g, Ballaststoffe 2,1g',
  },
  contact: {
    zh: '客服热线 400-000-0000\n官网 www.aurora-foods.cn',
    en: 'Hotline +86 400 000 0000\nwww.aurora-foods.cn',
    de: 'Hotline +86 400 000 0000\nwww.aurora-foods.cn',
  },
  ingredients: {
    zh: '配料：燕麦、蔓越莓干、蓝莓干、蜂蜜、葵花籽油、食用盐。',
    en: 'Ingredients: oats, dried cranberries, dried blueberries, honey, sunflower oil, salt.',
    de: 'Zutaten: Hafer, getrocknete Cranberries, getrocknete Blaubeeren, Honig, Sonnenblumenöl, Salz.',
  },
  warning: {
    zh: '警示：含麸质及坚果制品，过敏者慎用。',
    en: 'Warning: contains gluten and tree nuts.',
    de: 'Warnhinweis: enthält Gluten und Schalenfrüchte.',
  },
  declaration: {
    zh: '强制声明：本产品符合 GB 7718 食品安全国家标准，生产日期见包装喷码。',
    en: 'Mandatory declaration: this product complies with GB 7718. Production date: see inkjet code.',
    de: 'Pflichtangabe: entspricht der Norm GB 7718. Herstellungsdatum: siehe Aufdruck.',
  },
  storage: {
    zh: '储存：置于阴凉干燥处，避免阳光直射。',
    en: 'Storage: keep cool and dry, away from sunlight.',
    de: 'Lagerung: kühl und trocken lagern.',
  },
  recycling: {
    zh: '回收：请将外盒投入可回收物垃圾桶。',
    en: 'Recycling: dispose of the carton as paper waste.',
    de: 'Recycling: Karton bitte dem Altpapier zuführen.',
  },
};

/**
 * 北欧上市改版：只列出有变化的文案，其余沿用基准版。
 * - 英语：标语变长（正面溢出）；联系信息加入超长追溯链接（侧面越界）。
 * - 德语：警示语大幅变长（背面溢出一行）；强制声明改长并被挪到过小的认证区（声明拆分 + 阅读顺序错乱）。
 */
const NORDIC: Record<string, Partial<Record<Language, string>>> = {
  tagline: {
    zh: '北欧风味 · 每日能量 · 焕新',
    en: 'Now with 30% more hand-picked Nordic cloudberries and lingonberries — sustainably harvested above the Arctic Circle this season only!',
  },
  contact: {
    en: 'Consumer hotline +86 400 000 0000\nTrace this pack: https://www.aurora-foods-nordic-example.com/trace',
  },
  ingredients: {
    en: 'Ingredients: oats, dried cloudberries, dried lingonberries, dried cranberries, honey, sunflower oil, salt.',
  },
  warning: {
    de: 'Warnhinweis: enthält Gluten, Schalenfrüchte und Spuren von Erdnüssen. Kann Spuren von Soja und Milch enthalten. Nicht für Kleinkinder unter drei Jahren geeignet. Nach dem Öffnen innerhalb von drei Tagen verzehren. Vor Wärme und Feuchtigkeit schützen.',
  },
  declaration: {
    de: 'Pflichtangabe: entspricht der Norm GB 7718 sowie der Verordnung (EU) Nr. 1169/2011. Herstellungsdatum und Mindesthaltbarkeitsdatum: siehe Aufdruck.',
  },
};

export const PRESET_TEXTS: TextsMap = Object.fromEntries(
  Object.entries(BASE).map(([blockId, langs]) => [
    blockId,
    Object.fromEntries(
      (['zh', 'en', 'de'] as Language[]).map((lang) => [
        lang,
        { base: langs[lang], nordic: NORDIC[blockId]?.[lang] ?? langs[lang] },
      ]),
    ),
  ]),
) as TextsMap;
