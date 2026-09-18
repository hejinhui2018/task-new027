import { BLOCK_BY_ID, FONTS, PANEL_BY_ID, REGION_BY_ID } from '../engine/presets';
import type { PanelLayout, RegionLayout } from '../engine/types';

/** CSS 像素换算：1mm = 96/25.4 px，1pt = 96/72 px */
export const MM_TO_PX = 96 / 25.4;
export const PT_TO_PX = 96 / 72;

interface PanelViewProps {
  layout: PanelLayout;
  zoom: number;
}

/** 单个面版：按真实毫米渲染全部区域与文字行 */
export function PanelView({ layout, zoom }: PanelViewProps) {
  const panel = PANEL_BY_ID[layout.panelId];
  const bad = layout.violations.length > 0;
  return (
    <figure className="panel-wrap">
      <figcaption>
        <span className="panel-name">
          {panel.label} · {panel.widthMm}×{panel.heightMm}mm
        </span>
        <span className={bad ? 'pill bad' : 'pill ok'}>
          {bad ? `${layout.violations.length} 项问题` : '通过'}
        </span>
      </figcaption>
      <div
        className="panel-outer"
        style={{ width: panel.widthMm * MM_TO_PX * zoom, height: panel.heightMm * MM_TO_PX * zoom }}
      >
        <div
          className="panel-scale"
          style={{
            transform: `scale(${zoom})`,
            width: panel.widthMm * MM_TO_PX,
            height: panel.heightMm * MM_TO_PX,
          }}
        >
          {layout.regions.map((rl) => (
            <RegionBox key={rl.regionId} regionLayout={rl} />
          ))}
        </div>
      </div>
    </figure>
  );
}

function RegionBox({ regionLayout }: { regionLayout: RegionLayout }) {
  const region = REGION_BY_ID[regionLayout.regionId];
  const font = FONTS.find((f) => f.id === regionLayout.scheme.fontId) ?? FONTS[0];
  const hasBlocks = regionLayout.blockRanges.length > 0;
  const violatedBlocks = new Set(
    regionLayout.violations.map((v) => v.blockId).filter((x): x is string => Boolean(x)),
  );
  const firstMessage = regionLayout.violations[0]?.message;

  return (
    <div
      className={regionLayout.fits ? 'region' : 'region region-bad'}
      style={{
        left: region.xMm * MM_TO_PX,
        top: region.yMm * MM_TO_PX,
        width: region.widthMm * MM_TO_PX,
        height: region.heightMm * MM_TO_PX,
      }}
      title={firstMessage}
    >
      <span className="region-label">
        {region.label}
        {hasBlocks && (
          <em className={regionLayout.fits ? 'scheme' : 'scheme bad'}>
            {regionLayout.fits
              ? `${regionLayout.scheme.sizePt}pt · ×${regionLayout.scheme.lineHeight}`
              : '无可用方案'}
          </em>
        )}
        {!regionLayout.fits && <i className="region-flag">!</i>}
      </span>
      {regionLayout.items.map((it, i) => {
        const cls = ['line'];
        if (it.overflowsRegion) cls.push('line-overflow');
        if (it.widthMm > region.widthMm + 1e-6) cls.push('line-overlong');
        if (violatedBlocks.has(it.blockId)) cls.push('line-violation');
        return (
          <div
            key={i}
            className={cls.join(' ')}
            title={BLOCK_BY_ID[it.blockId]?.label}
            style={{
              top: it.yMm * MM_TO_PX,
              fontSize: regionLayout.scheme.sizePt * PT_TO_PX,
              lineHeight: `${it.lineHeightMm * MM_TO_PX}px`,
              height: it.lineHeightMm * MM_TO_PX,
              fontFamily: font.cssFamily,
            }}
          >
            {it.text}
          </div>
        );
      })}
    </div>
  );
}
