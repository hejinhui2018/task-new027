import type { ProductSpec, ZoneConstraints } from '../types';

interface ConstraintsEditorProps {
  spec: ProductSpec;
  constraints: Record<string, ZoneConstraints>;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  onChange: (zoneId: string, constraints: ZoneConstraints) => void;
}

function NumberField({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="num-field">
      {label}
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v > 0) onChange(v);
        }}
      />
    </label>
  );
}

/** 约束编辑：调整某区域允许的字体、字号范围与行距范围，改动立即触发重排 */
export function ConstraintsEditor(props: ConstraintsEditorProps) {
  const zoneId = props.selectedZoneId ?? props.spec.panels[0].zones[0].id;
  const zone = props.spec.panels.flatMap((p) => p.zones).find((z) => z.id === zoneId);
  if (!zone) return null;
  const c = props.constraints[zone.id] ?? zone.defaultConstraints;

  const update = (next: ZoneConstraints) => props.onChange(zone.id, next);
  const setSize = (field: 'min' | 'max', v: number) => {
    const r = { ...c.fontSizePt, [field]: v };
    if (r.min > r.max) r[field === 'min' ? 'max' : 'min'] = r[field];
    update({ ...c, fontSizePt: r });
  };
  const setLh = (field: 'min' | 'max', v: number) => {
    const r = { ...c.lineHeight, [field]: v };
    if (r.min > r.max) r[field === 'min' ? 'max' : 'min'] = r[field];
    update({ ...c, lineHeight: r });
  };
  const toggleFont = (fontId: string) => {
    const has = c.allowedFontIds.includes(fontId);
    if (has && c.allowedFontIds.length === 1) return; // 至少保留一种字体
    const allowedFontIds = has
      ? c.allowedFontIds.filter((id) => id !== fontId)
      : [...c.allowedFontIds, fontId];
    update({ ...c, allowedFontIds });
  };

  return (
    <div className="constraints-editor">
      <label className="field-row">
        排版区域
        <select value={zone.id} onChange={(e) => props.onSelectZone(e.target.value)}>
          {props.spec.panels.map((p) => (
            <optgroup key={p.id} label={p.name}>
              {p.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}（{z.rect.w}×{z.rect.h}mm）
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>允许的字体</legend>
        {props.spec.fonts.map((f) => (
          <label key={f.id} className="check-row">
            <input
              type="checkbox"
              checked={c.allowedFontIds.includes(f.id)}
              onChange={() => toggleFont(f.id)}
            />
            {f.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>字号范围（pt）</legend>
        <div className="field-row-group">
          <NumberField label="最小" value={c.fontSizePt.min} step={0.5} min={1} onChange={(v) => setSize('min', v)} />
          <NumberField label="最大" value={c.fontSizePt.max} step={0.5} min={1} onChange={(v) => setSize('max', v)} />
        </div>
      </fieldset>

      <fieldset>
        <legend>行距范围（倍数）</legend>
        <div className="field-row-group">
          <NumberField label="最小" value={c.lineHeight.min} step={0.05} min={0.5} onChange={(v) => setLh('min', v)} />
          <NumberField label="最大" value={c.lineHeight.max} step={0.05} min={0.5} onChange={(v) => setLh('max', v)} />
        </div>
      </fieldset>

      <p className="hint">
        系统按「字号从大到小 → 行距从小到大 → 字体按列表顺序」枚举候选方案，取第一个能完整放下的方案；
        全部放不下时报告具体缺口。
      </p>
    </div>
  );
}
