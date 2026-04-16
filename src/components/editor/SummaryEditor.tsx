import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useCVStore } from "../../store/cvStore";
import type { Section, SummaryItem } from "../../types/cv";
import { GenerateSummary } from "../ai/GenerateSummary";

export function SummaryEditor({ section }: { section: Section }) {
  const addItem = useCVStore((s) => s.addItem);
  const updateItem = useCVStore((s) => s.updateItem);
  const items = section.items as SummaryItem[];

  return (
    <div className="pt-3 space-y-2">
      {items.length === 0 ? (
        <button
          onClick={() => addItem(section.id)}
          className="text-xs text-accent hover:text-primary transition-colors"
        >
          <Trans>+ Add summary</Trans>
        </button>
      ) : (
        items.map((item) => (
          <div key={item.id} className="space-y-2">
            <textarea
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors resize-y min-h-20 bg-transparent"
              placeholder={t`Write a brief professional summary...`}
              value={item.content}
              onChange={(e) =>
                updateItem(section.id, item.id, { content: e.target.value })
              }
            />
            <GenerateSummary sectionId={section.id} itemId={item.id} />
          </div>
        ))
      )}
    </div>
  );
}
