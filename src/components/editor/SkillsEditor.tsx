import { useCVStore } from "../../store/cvStore";
import type { Section, SkillItem } from "../../types/cv";

export function SkillsEditor({ section }: { section: Section }) {
  const addItem = useCVStore((s) => s.addItem);
  const removeItem = useCVStore((s) => s.removeItem);
  const updateItem = useCVStore((s) => s.updateItem);
  const items = section.items as SkillItem[];

  const inputClass =
    "w-full border-b border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors bg-transparent";

  return (
    <div className="pt-3 space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-light">
          No skill categories yet. Add one below.
        </p>
      )}

      {items.map((item) => (
        <div key={item.id} className="space-y-1.5 p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            <input
              className={inputClass + " bg-gray-50"}
              placeholder="Category (e.g. Frontend)"
              value={item.category}
              onChange={(e) =>
                updateItem(section.id, item.id, { category: e.target.value })
              }
            />
            <button
              onClick={() => removeItem(section.id, item.id)}
              className="text-light hover:text-red-500 transition-colors text-sm shrink-0"
              title="Remove category"
            >
              ✕
            </button>
          </div>
          <input
            className={inputClass + " bg-gray-50"}
            placeholder="Skills (comma-separated, e.g. React, TypeScript, Node.js)"
            value={item.items.join(", ")}
            onChange={(e) =>
              updateItem(section.id, item.id, {
                items: e.target.value.split(",").map((s) => s.trim()),
              })
            }
          />
        </div>
      ))}

      <button
        onClick={() => addItem(section.id)}
        className="text-xs text-accent hover:text-primary transition-colors"
      >
        + Add category
      </button>
    </div>
  );
}
