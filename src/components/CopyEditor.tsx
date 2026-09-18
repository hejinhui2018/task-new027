import { BLOCKS, PANELS, REGION_BY_ID } from '../engine/presets';
import { resolveRegionId } from '../engine/layout';
import type { Action, WorkbenchState } from '../state/store';

interface Props {
  state: WorkbenchState;
  dispatch: React.Dispatch<Action>;
}

/** 文案编辑：按面版分组，编辑当前语言 + 当前版本的文本，改动立即重排 */
export function CopyEditor({ state, dispatch }: Props) {
  return (
    <div className="copy-editor">
      {PANELS.map((panel) => (
        <section key={panel.id}>
          <h4>{panel.label}</h4>
          {BLOCKS.filter((b) => b.panelId === panel.id)
            .sort((a, b) => a.order - b.order)
            .map((block) => {
              const text = state.texts[block.id][state.language][state.version];
              const regionId = resolveRegionId(block, state.language, state.version);
              return (
                <div className="copy-block" key={block.id}>
                  <div className="copy-head">
                    <span className="copy-name">
                      {block.order}. {block.label}
                    </span>
                    {block.atomic && <em className="atomic-tag">不可拆分</em>}
                    <span className="copy-region">{REGION_BY_ID[regionId]?.label}</span>
                  </div>
                  <textarea
                    rows={Math.min(6, Math.max(2, text.split('\n').length + 1))}
                    value={text}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_TEXT',
                        blockId: block.id,
                        language: state.language,
                        version: state.version,
                        text: e.target.value,
                      })
                    }
                  />
                </div>
              );
            })}
        </section>
      ))}
    </div>
  );
}
