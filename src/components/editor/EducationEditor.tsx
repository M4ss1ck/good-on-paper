import { useCVStore } from "../../store/cvStore";
import type { Section, EducationItem } from "../../types/cv";

export function EducationEditor({ section }: { section: Section }) {
  const addItem = useCVStore((s) => s.addItem);
  const removeItem = useCVStore((s) => s.removeItem);
  const updateItem = useCVStore((s) => s.updateItem);
  const items = section.items as EducationItem[];

  const inputClass =
    "w-full border-b border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors bg-transparent";

  return (
    <div className="pt-3 space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-light">
          No education entries yet. Add one below.
        </p>
      )}

      {items.map((item) => (
        <div key={item.id} className="space-y-2 p-3 bg-gray-50 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Education Entry
            </span>
            <button
              onClick={() => removeItem(section.id, item.id)}
              className="text-light hover:text-red-500 transition-colors text-xs"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass + " bg-gray-50"}
              placeholder="Degree / Certificate"
              value={item.degree}
              onChange={(e) =>
                updateItem(section.id, item.id, { degree: e.target.value })
              }
            />
            <input
              className={inputClass + " bg-gray-50"}
              placeholder="Institution"
              value={item.institution}
              onChange={(e) =>
                updateItem(section.id, item.id, {
                  institution: e.target.value,
                })
              }
            />
            <input
              className={inputClass + " bg-gray-50"}
              placeholder="Dates (e.g. 2018 – 2022)"
              value={item.dates}
              onChange={(e) =>
                updateItem(section.id, item.id, { dates: e.target.value })
              }
            />
            <input
              className={inputClass + " bg-gray-50"}
              placeholder="Notes (optional)"
              value={item.notes ?? ""}
              onChange={(e) =>
                updateItem(section.id, item.id, { notes: e.target.value })
              }
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => addItem(section.id)}
        className="text-xs text-accent hover:text-primary transition-colors"
      >
        + Add education
      </button>
    </div>
  );
}
