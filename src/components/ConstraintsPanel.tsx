import { FONTS } from '../engine/presets';
import type { Constraints } from '../engine/types';
import { sanitizeConstraints } from '../state/persistence';
import type { Action } from '../state/store';

interface Props {
  constraints: Constraints;
  dispatch: React.Dispatch<Action>;
}

/** 排版约束：允许的字体、字号范围、行距范围；修改后立即重排 */
export function ConstraintsPanel({ constraints, dispatch }: Props) {
  const update = (patch: Partial<Constraints>) => {
    dispatch({ type: 'SET_CONSTRAINTS', constraints: sanitizeConstraints({ ...constraints, ...patch }) });
  };

  return (
    <div className="constraints">
      <h4>允许的字体</h4>
      {FONTS.map((f) => {
        const checked = constraints.allowedFonts.includes(f.id);
        return (
          <label className="check" key={f.id}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                if (checked && constraints.allowedFonts.length === 1) return; // 至少保留一种
                update({
                  allowedFonts: checked
                    ? constraints.allowedFonts.filter((x) => x !== f.id)
                    : [...constraints.allowedFonts, f.id],
                });
              }}
            />
            {f.label}
          </label>
        );
      })}

      <h4>字号范围（pt）</h4>
      <div className="row">
        <label>
          最小
          <input
            type="number"
            step="0.5"
            min="4"
            max="20"
            value={constraints.minFontSizePt}
            onChange={(e) => update({ minFontSizePt: Number(e.target.value) })}
          />
        </label>
        <label>
          最大
          <input
            type="number"
            step="0.5"
            min="4"
            max="20"
            value={constraints.maxFontSizePt}
            onChange={(e) => update({ maxFontSizePt: Number(e.target.value) })}
          />
        </label>
      </div>

      <h4>行距范围（×字号）</h4>
      <div className="row">
        <label>
          最小
          <input
            type="number"
            step="0.05"
            min="1"
            max="2"
            value={constraints.minLineHeight}
            onChange={(e) => update({ minLineHeight: Number(e.target.value) })}
          />
        </label>
        <label>
          最大
          <input
            type="number"
            step="0.05"
            min="1"
            max="2"
            value={constraints.maxLineHeight}
            onChange={(e) => update({ maxLineHeight: Number(e.target.value) })}
          />
        </label>
      </div>

      <p className="hint">
        修改后立即按实际文字测量重排；系统会在允许范围内自动选择可用方案，找不到时给出具体失败原因。
      </p>
    </div>
  );
}
