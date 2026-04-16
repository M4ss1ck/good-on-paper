import { X } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useCVStore } from "../../store/cvStore";
import type { Section, CustomItem } from "../../types/cv";

export function CustomEditor({ section }: { section: Section }) {
  const addItem = useCVStore((s) => s.addItem);
  const removeItem = useCVStore((s) => s.removeItem);
  const updateItem = useCVStore((s) => s.updateItem);
  const items = section.items as CustomItem[];

  return (
    <div className="pt-3 space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-light"><Trans>No content yet. Add an entry below.</Trans></p>
      )}

      {items.map((item) => (
        <div key={item.id} className="relative">
          <textarea
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors resize-y min-h-15 bg-transparent"
            placeholder={t`Freeform content...`}
            value={item.content}
            onChange={(e) =>
              updateItem(section.id, item.id, { content: e.target.value })
            }
          />
          <button
            onClick={() => removeItem(section.id, item.id)}
            className="absolute top-2 right-2 text-light hover:text-red-500 transition-colors text-sm"
            title={t`Remove entry`}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <button
        onClick={() => addItem(section.id)}
        className="text-xs text-accent hover:text-primary transition-colors"
      >
        <Trans>+ Add entry</Trans>
      </button>
    </div>
  );
}
