import type { SectionDiff as SectionDiffType, ItemDiff, BulletChange } from "../../types/diff";
import { TextDiff } from "./TextDiff";

interface SectionDiffProps {
  diff: SectionDiffType;
}

const statusColors: Record<string, string> = {
  added: "bg-green-100 text-green-700",
  removed: "bg-red-100 text-red-700",
  changed: "bg-amber-100 text-amber-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export function SectionDiff({ diff }: SectionDiffProps) {
  const defaultOpen = diff.type !== "changed" || diff.items.length > 0 || !!diff.titleChange;

  return (
    <details open={defaultOpen} className="border border-gray-200 rounded">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none hover:bg-gray-50 transition-colors">
        <StatusBadge status={diff.type} />
        <span className="text-sm font-medium text-primary">{diff.sectionTitle}</span>
        <span className="text-xs text-light">({diff.sectionType})</span>
      </summary>

      <div className="px-3 pb-3 space-y-2">
        {diff.titleChange && (
          <div className="text-sm">
            <span className="text-muted">Title: </span>
            <TextDiff before={diff.titleChange.before} after={diff.titleChange.after} />
          </div>
        )}

        {diff.visibilityChange && (
          <div className="text-sm text-muted">
            Visibility: {String(diff.visibilityChange.before)} → {String(diff.visibilityChange.after)}
          </div>
        )}

        {diff.items.length > 0 && (
          <div className="space-y-2 mt-1">
            {diff.items.map((item) => (
              <ItemDiffRow key={item.itemId} item={item} />
            ))}
          </div>
        )}

        {diff.type === "added" && diff.items.length === 0 && (
          <p className="text-xs text-green-600 italic">New empty section</p>
        )}
        {diff.type === "removed" && diff.items.length === 0 && (
          <p className="text-xs text-red-600 italic">Removed empty section</p>
        )}
      </div>
    </details>
  );
}

function ItemDiffRow({ item }: { item: ItemDiff }) {
  const borderColor =
    item.type === "added" ? "border-l-green-400" :
      item.type === "removed" ? "border-l-red-400" :
        "border-l-amber-400";

  return (
    <div className={`border-l-2 ${borderColor} pl-3 py-1 space-y-1`}>
      <div className="flex items-center gap-2">
        <StatusBadge status={item.type} />
        <span className="text-sm text-primary">{item.identifier}</span>
      </div>

      {item.fields.length > 0 && (
        <div className="space-y-0.5">
          {item.fields.map((f) => (
            <div key={f.field} className="text-sm">
              <span className="text-muted capitalize">{f.field}: </span>
              <TextDiff before={f.before} after={f.after} />
            </div>
          ))}
        </div>
      )}

      {item.bullets && item.bullets.length > 0 && (
        <div className="space-y-0.5 ml-2">
          <span className="text-xs text-muted font-medium">Bullets:</span>
          {item.bullets.map((b, i) => (
            <BulletDiffRow key={i} bullet={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BulletDiffRow({ bullet }: { bullet: BulletChange }) {
  if (bullet.type === "added") {
    return (
      <div className="text-sm bg-green-50 text-green-600 px-2 py-0.5 rounded">
        + {bullet.after}
      </div>
    );
  }

  if (bullet.type === "removed") {
    return (
      <div className="text-sm bg-red-50 text-red-600 line-through px-2 py-0.5 rounded">
        − {bullet.before}
      </div>
    );
  }

  // changed
  return (
    <div className="text-sm px-2 py-0.5">
      <TextDiff before={bullet.before ?? ""} after={bullet.after ?? ""} />
    </div>
  );
}
