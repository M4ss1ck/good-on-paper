import { X } from "lucide-react";
import { useCVStore } from "../../store/cvStore";
import type { Section, LanguageItem } from "../../types/cv";

export function LanguagesEditor({ section }: { section: Section }) {
  const addItem = useCVStore((s) => s.addItem);
  const removeItem = useCVStore((s) => s.removeItem);
  const updateItem = useCVStore((s) => s.updateItem);
  const items = section.items as LanguageItem[];

  const inputClass =
    "w-full border-b border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors bg-transparent";

  return (
    <div className="pt-3 space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-light">No languages added yet.</p>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            className={inputClass}
            placeholder="Language"
            value={item.language}
            onChange={(e) =>
              updateItem(section.id, item.id, { language: e.target.value })
            }
          />
          <select
            className="border-b border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors bg-transparent"
            value={item.level}
            onChange={(e) =>
              updateItem(section.id, item.id, { level: e.target.value })
            }
          >
            <option value="">Select level</option>
            <option value="Native">Native</option>
            <option value="Professional">Professional</option>
            <option value="Conversational">Conversational</option>
            <option value="Basic">Basic</option>
          </select>
          <button
            onClick={() => removeItem(section.id, item.id)}
            className="text-light hover:text-red-500 transition-colors text-sm shrink-0"
            title="Remove language"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <button
        onClick={() => addItem(section.id)}
        className="text-xs text-accent hover:text-primary transition-colors"
      >
        + Add language
      </button>
    </div>
  );
}
