/* V/TO Builder — field components.
   Renders one field by spec, optionally with progressive reveal control.
   All inputs are uncontrolled-ish via local state with parent commit on change. */

function VtoLabel({ children, optional, help, htmlFor }) {
  return (
    <div className="vfield__labelwrap">
      <label className="vfield__label" htmlFor={htmlFor}>
        {children}
        {optional ? <span className="vfield__optional"> (optional)</span> : null}
      </label>
      {help ? <div className="vfield__help">{help}</div> : null}
    </div>
  );
}

/* Plain text field */
function VtoTextField({ field, value, onChange, autoFocus, onCommit }) {
  const id = "f-" + field.key;
  return (
    <div className="vfield">
      <VtoLabel htmlFor={id} optional={field.optional} help={field.help}>{field.label}</VtoLabel>
      <input
        id={id}
        type="text"
        className="vfield__input"
        placeholder={field.placeholder || ""}
        value={value || ""}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onCommit && onCommit()}
      />
    </div>
  );
}

/* Textarea */
function VtoTextareaField({ field, value, onChange, autoFocus, onCommit }) {
  const id = "f-" + field.key;
  return (
    <div className="vfield">
      <VtoLabel htmlFor={id} optional={field.optional} help={field.help}>{field.label}</VtoLabel>
      <textarea
        id={id}
        className="vfield__input vfield__input--textarea"
        placeholder={field.placeholder || ""}
        rows="3"
        value={value || ""}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onCommit && onCommit()}
      />
    </div>
  );
}

/* List field — single-string entries OR paired { name, extra } */
function VtoListField({ field, value, onChange, autoFocus, onCommit }) {
  const items = Array.isArray(value) ? value : [];
  const isPair = !!(field.item && field.item.extra);

  const setItem = (i, val) => {
    const next = items.slice();
    while (next.length <= i) next.push(isPair ? {} : "");
    next[i] = val;
    onChange(next);
  };
  const setPair = (i, sub, val) => {
    const next = items.slice();
    while (next.length <= i) next.push({});
    const row = typeof next[i] === "object" && next[i] ? Object.assign({}, next[i]) : {};
    row[sub] = val;
    next[i] = row;
    onChange(next);
  };
  const removeItem = (i) => {
    const next = items.slice();
    next.splice(i, 1);
    onChange(next);
  };
  const addItem = () => {
    const next = items.slice();
    next.push(isPair ? {} : "");
    onChange(next);
  };

  // Always render at least one row so the field has presence.
  const display = items.length === 0 ? [isPair ? {} : ""] : items;
  const atMax = display.length >= (field.max || 99);
  const colsClass = field.cols === "name-wide" ? "vlist__row--name-wide" : "";

  return (
    <div className="vfield vfield--list">
      <VtoLabel optional={field.optional} help={field.help}>{field.label}</VtoLabel>

      <div className="vlist">
        {display.map((row, i) => {
          if (isPair) {
            const nameVal = (typeof row === "object" && row) ? (row[field.item.name] || "") : "";
            const extraVal = (typeof row === "object" && row) ? (row[field.item.extra] || "") : "";
            const namePh = (field.placeholders || {}).name || "";
            const extraPh = (field.placeholders || {}).extra || "";
            return (
              <div className={"vlist__row " + colsClass} key={i}>
                <span className="vlist__num">{i + 1}</span>
                <div className="vlist__fields">
                  {field.item.nameMultiline ? (
                    <textarea
                      className="vfield__input vfield__input--textarea"
                      rows="2"
                      placeholder={namePh}
                      value={nameVal}
                      autoFocus={autoFocus && i === 0}
                      onChange={(e) => setPair(i, field.item.name, e.target.value)}
                      onBlur={() => onCommit && onCommit()}
                    />
                  ) : (
                    <input
                      type="text"
                      className="vfield__input"
                      placeholder={namePh}
                      value={nameVal}
                      autoFocus={autoFocus && i === 0}
                      onChange={(e) => setPair(i, field.item.name, e.target.value)}
                      onBlur={() => onCommit && onCommit()}
                    />
                  )}
                  <input
                    type="text"
                    className="vfield__input"
                    placeholder={extraPh}
                    value={extraVal}
                    onChange={(e) => setPair(i, field.item.extra, e.target.value)}
                    onBlur={() => onCommit && onCommit()}
                  />
                </div>
                <button
                  type="button"
                  className="vlist__remove"
                  onClick={() => removeItem(i)}
                  aria-label="Remove"
                  title="Remove"
                >×</button>
              </div>
            );
          }
          const v = typeof row === "string" ? row : (row && row.name) || "";
          return (
            <div className="vlist__row vlist__row--single" key={i}>
              <span className="vlist__num">{i + 1}</span>
              <input
                type="text"
                className="vfield__input"
                placeholder={(field.placeholders || {}).name || ""}
                value={v}
                autoFocus={autoFocus && i === 0}
                onChange={(e) => setItem(i, e.target.value)}
                onBlur={() => onCommit && onCommit()}
              />
              <button
                type="button"
                className="vlist__remove"
                onClick={() => removeItem(i)}
                aria-label="Remove"
                title="Remove"
              >×</button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="vlist__add"
        onClick={addItem}
        disabled={atMax}
      >
        + {field.addLabel || "Add"}
      </button>

      <style>{`
        .vlist { display: flex; flex-direction: column; gap: 10px; margin: 4px 0 10px; }
        .vlist__row {
          display: grid;
          grid-template-columns: 28px 1fr 28px;
          gap: 10px;
          align-items: start;
        }
        .vlist__row--single { align-items: center; }
        .vlist__row--single .vlist__num { margin-top: 0; }
        .vlist__num {
          width: 26px; height: 26px;
          background: var(--color-brand-blue-08);
          color: var(--color-brand-blue-heavy);
          border-radius: 50%;
          display: grid; place-items: center;
          font-size: 12px;
          font-weight: 700;
          margin-top: 8px;
        }
        .vlist__fields {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
          min-width: 0;
        }
        .vlist__row:not(.vlist__row--name-wide) .vlist__fields {
          grid-template-columns: minmax(180px, 1fr) 2fr;
        }
        .vlist__row--name-wide .vlist__fields {
          grid-template-columns: 2.5fr minmax(130px, 1fr);
        }
        @media (max-width: 720px) {
          .vlist__row:not(.vlist__row--name-wide) .vlist__fields,
          .vlist__row--name-wide .vlist__fields {
            grid-template-columns: 1fr;
          }
        }
        .vlist__remove {
          appearance: none;
          background: transparent;
          border: 1px solid transparent;
          color: var(--color-brand-slate);
          width: 26px; height: 26px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          margin-top: 6px;
          opacity: 0;
          transition: all var(--t-fast);
        }
        .vlist__row:hover .vlist__remove,
        .vlist__row:focus-within .vlist__remove { opacity: 1; }
        .vlist__remove:hover {
          color: var(--color-error);
          border-color: var(--border-subtle);
          background: var(--color-white);
        }
        .vlist__add {
          appearance: none;
          background: transparent;
          color: var(--color-brand-blue);
          border: 1px dashed var(--color-brand-blue);
          padding: 7px 14px;
          font-size: 13.5px;
          font-weight: 600;
          border-radius: var(--radius-md);
          cursor: pointer;
          align-self: flex-start;
          transition: all var(--t-fast);
        }
        .vlist__add:hover {
          background: var(--color-brand-blue-08);
        }
        .vlist__add:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-style: solid;
        }
      `}</style>
    </div>
  );
}

/* Field dispatcher */
function VtoField({ field, value, onChange, autoFocus, onCommit }) {
  if (field.type === "text")     return <VtoTextField     field={field} value={value} onChange={onChange} autoFocus={autoFocus} onCommit={onCommit} />;
  if (field.type === "textarea") return <VtoTextareaField field={field} value={value} onChange={onChange} autoFocus={autoFocus} onCommit={onCommit} />;
  if (field.type === "list")     return <VtoListField     field={field} value={value} onChange={onChange} autoFocus={autoFocus} onCommit={onCommit} />;
  return null;
}

/* Determine whether a field has been "filled enough" to consider complete.
   Used to drive progressive reveal of the next field. */
function vtoFieldFilled(field, value) {
  if (field.type === "text" || field.type === "textarea") {
    return typeof value === "string" && value.trim().length >= 2;
  }
  if (field.type === "list") {
    if (!Array.isArray(value)) return false;
    const isPair = !!(field.item && field.item.extra);
    const filledCount = value.filter((row) => {
      if (isPair) {
        const n = row && row[field.item.name];
        return typeof n === "string" && n.trim().length >= 2;
      }
      const v = typeof row === "string" ? row : (row && row.name);
      return typeof v === "string" && v.trim().length >= 2;
    }).length;
    return filledCount >= (field.min || 1);
  }
  return false;
}

/* Determine partial completion (any input) */
function vtoFieldStarted(field, value) {
  if (field.type === "text" || field.type === "textarea") {
    return typeof value === "string" && value.trim().length > 0;
  }
  if (field.type === "list") {
    if (!Array.isArray(value)) return false;
    return value.some((row) => {
      if (row && typeof row === "object") return Object.values(row).some((v) => typeof v === "string" && v.trim().length > 0);
      return typeof row === "string" && row.trim().length > 0;
    });
  }
  return false;
}

/* Section completion ratio 0..1, based on field completion.
   Lists with `min` count proportionally toward their min so progress feels alive. */
function vtoSectionProgress(section, answers) {
  if (!section || !section.fields) return 0;
  const total = section.fields.length;
  if (total === 0) return 0;
  let sum = 0;
  section.fields.forEach(function (f) {
    const v = (answers || {})[f.key];
    if (vtoFieldFilled(f, v)) { sum += 1; return; }
    if (f.type === "list" && Array.isArray(v)) {
      const isPair = !!(f.item && f.item.extra);
      const filledCount = v.filter(function (row) {
        if (isPair) {
          const n = row && row[f.item.name];
          return typeof n === "string" && n.trim().length >= 2;
        }
        const val = typeof row === "string" ? row : (row && row.name);
        return typeof val === "string" && val.trim().length >= 2;
      }).length;
      const target = f.min || 1;
      sum += Math.min(filledCount / target, 0.95); // partial credit up to 0.95
    } else if (vtoFieldStarted(f, v)) {
      sum += 0.5;
    }
  });
  return sum / total;
}

/* Shared field styles — used inside all sections. Injected once. */
function VtoFieldStyles() {
  return (
    <style>{`
      .vfield {
        margin-bottom: 20px;
      }
      .vfield:last-child { margin-bottom: 0; }
      .vfield__labelwrap { margin-bottom: 8px; }
      .vfield__label {
        display: block;
        font-weight: 600;
        font-size: 14px;
        color: var(--fg-1);
        letter-spacing: -0.005em;
      }
      .vfield__optional {
        color: var(--color-brand-slate);
        font-weight: 400;
        font-size: 12px;
        margin-left: 6px;
      }
      .vfield__help {
        font-size: 13px;
        color: var(--fg-2);
        margin-top: 3px;
        line-height: 1.5;
      }
      .vfield__input {
        width: 100%;
        padding: 10px 13px;
        font-size: 15px;
        font-family: inherit;
        color: var(--fg-1);
        background: var(--color-white);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        outline: none;
        transition: border-color var(--t-fast), box-shadow var(--t-fast);
        line-height: 1.45;
      }
      .vfield__input::placeholder { color: var(--color-brand-slate); }
      .vfield__input:hover { border-color: var(--border-strong); }
      .vfield__input:focus {
        border-color: var(--color-brand-blue);
        box-shadow: 0 0 0 3px var(--color-brand-blue-15);
      }
      .vfield__input--textarea {
        min-height: 88px;
        resize: vertical;
        line-height: 1.55;
      }
    `}</style>
  );
}

Object.assign(window, {
  VtoField, VtoTextField, VtoTextareaField, VtoListField,
  VtoFieldStyles, vtoFieldFilled, vtoFieldStarted, vtoSectionProgress
});
