import type { FontSpec, Panel } from '../types';
import type { LaidBlock, PanelLayout, Violation } from '../engine/layout';
import { BLOCK_GAP_MM } from '../engine/layout';
import { PT_TO_MM } from '../engine/measurer';

interface PanelViewProps {
  panel: Panel;
  layout: PanelLayout;
  violations: Violation[];
  fonts: FontSpec[];
  /** 当前选中的区域（用于高亮定位） */
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  /** 像素/毫米比例 */
  scale: number;
  title?: string;
}

function BlockView({
  laid,
  fonts,
  scale,
}: {
  laid: LaidBlock;
  fonts: FontSpec[];
  scale: number;
}) {
  const { candidate } = laid;
  const font = fonts.find((f) => f.id === candidate.fontId);
  const fontSizePx = candidate.sizePt * PT_TO_MM * scale;
  const lineHeightPx = fontSizePx * candidate.lineHeight;
  const bad = !laid.fitsHeight || !laid.fitsWidth;
  return (
    <div
      className={bad ? 'block block-error' : 'block'}
      style={{ marginBottom: BLOCK_GAP_MM * scale }}
      title={`${laid.block.label} · ${candidate.sizePt}pt / 行距 ${candidate.lineHeight} · ${font?.label ?? candidate.fontId}`}
    >
      {laid.block.kind === 'atomic' && <span className="tag-atomic">不可拆分</span>}
      {laid.lines.map((line, i) => (
        <div
          key={i}
          className="block-line"
          style={{
            fontFamily: font?.cssFamily,
            fontSize: fontSizePx,
            lineHeight: `${lineHeightPx}px`,
            height: lineHeightPx,
          }}
        >
          {line.text || ' '}
        </div>
      ))}
    </div>
  );
}

/** 按真实毫米渲染一个面板及其区域内的排版结果 */
export function PanelView(props: PanelViewProps) {
  const { panel, layout, scale } = props;
  return (
    <figure className="panel-figure">
      <figcaption className="panel-caption">
        {props.title ?? panel.name} · {panel.widthMm}×{panel.heightMm}mm
      </figcaption>
      <div
        className="panel"
        style={{ width: panel.widthMm * scale, height: panel.heightMm * scale }}
        data-panel={panel.id}
      >
        {panel.zones.map((zone) => {
          const zl = layout.zones[zone.id];
          const zoneViolations = props.violations.filter((v) => v.zoneId === zone.id);
          const hasError = zoneViolations.length > 0;
          const selected = props.selectedZoneId === zone.id;
          const cls = [
            'zone',
            hasError ? 'zone-error' : '',
            selected ? 'zone-selected' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={zone.id}
              className={cls}
              style={{
                left: zone.rect.x * scale,
                top: zone.rect.y * scale,
                width: zone.rect.w * scale,
                height: zone.rect.h * scale,
              }}
              onClick={() => props.onSelectZone(zone.id)}
              role="button"
              aria-label={`${zone.name}${hasError ? `（${zoneViolations.length} 个问题）` : ''}`}
            >
              <span className="zone-tag">
                {zone.name}
                {hasError ? ` ⚠${zoneViolations.length}` : ''}
              </span>
              <div
                className="zone-content"
                style={{ padding: zone.paddingMm * scale }}
              >
                {zl.blocks.map((b) => (
                  <BlockView key={b.block.id} laid={b} fonts={props.fonts} scale={scale} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="panel-hint">
        {props.violations.length > 0
          ? `${props.violations.length} 个问题：${props.violations
              .map((v) => v.label)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join('、')}`
          : '全部放得下'}
      </figcaption>
    </figure>
  );
}
