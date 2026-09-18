import type { CopyVersion, LanguageCode, ProductSpec } from '../types';

interface CopyEditorProps {
  spec: ProductSpec;
  version: CopyVersion;
  language: LanguageCode;
  onEdit: (blockId: string, text: string) => void;
}

/** 文案编辑：按面板/区域分组列出当前语言+版本的全部文案块，改动立即触发重排 */
export function CopyEditor({ spec, version, language, onEdit }: CopyEditorProps) {
  const blocks = version.copy[language];
  return (
    <div className="copy-editor">
      {spec.panels.map((panel) => (
        <section key={panel.id} className="copy-group">
          <h3>{panel.name}</h3>
          {panel.zones.map((zone) => {
            const zoneBlocks = blocks
              .filter((b) => b.zoneId === zone.id)
              .sort((a, b) => a.readingOrder - b.readingOrder);
            if (zoneBlocks.length === 0) return null;
            return (
              <div key={zone.id} className="copy-zone">
                {zoneBlocks.map((b) => (
                  <label key={b.id} className="copy-block">
                    <span className="copy-block-head">
                      <strong>{b.label}</strong>
                      <span className="copy-meta">
                        {zone.name} · 顺序 {b.readingOrder}
                        {b.kind === 'atomic' && <em className="tag-atomic">不可拆分</em>}
                      </span>
                    </span>
                    <textarea
                      value={b.text}
                      rows={Math.min(6, Math.max(2, Math.ceil(b.text.length / 40)))}
                      onChange={(e) => onEdit(b.id, e.target.value)}
                      spellCheck={false}
                    />
                  </label>
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
