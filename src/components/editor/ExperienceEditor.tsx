import { useCVStore } from "../../store/cvStore";
import type { Section, ExperienceItem } from "../../types/cv";
import { ImproveButton } from "../ai/ImproveButton";

export function ExperienceEditor({ section }: { section: Section }) {
  const addItem = useCVStore((s) => s.addItem);
  const removeItem = useCVStore((s) => s.removeItem);
  const updateItem = useCVStore((s) => s.updateItem);
  const addBullet = useCVStore((s) => s.addBullet);
  const removeBullet = useCVStore((s) => s.removeBullet);
  const updateBullet = useCVStore((s) => s.updateBullet);
  const items = section.items as ExperienceItem[];

  const inputClass =
    "w-full border-b border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors bg-transparent";

  return (
    <div className="pt-3 space-y-4">
      {items.length === 0 && (
        <p className="text-xs text-light">
          No experience entries yet. Add one below.
        </p>
      )}

      {items.map((item) => (
        <div key={item.id} className="space-y-2 p-3 bg-gray-50 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Experience Entry
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
              placeholder="Role / Title"
              value={item.role}
              onChange={(e) =>
                updateItem(section.id, item.id, { role: e.target.value })
              }
            />
            <input
              className={inputClass + " bg-gray-50"}
              placeholder="Company"
              value={item.company}
              onChange={(e) =>
                updateItem(section.id, item.id, { company: e.target.value })
              }
            />
            <input
              className={inputClass + " bg-gray-50"}
              placeholder="Location"
              value={item.location}
              onChange={(e) =>
                updateItem(section.id, item.id, { location: e.target.value })
              }
            />
            <div className="flex gap-2">
              <input
                className={inputClass + " bg-gray-50"}
                placeholder="Start date"
                value={item.startDate}
                onChange={(e) =>
                  updateItem(section.id, item.id, {
                    startDate: e.target.value,
                  })
                }
              />
              <input
                className={inputClass + " bg-gray-50"}
                placeholder="End date"
                value={item.endDate}
                onChange={(e) =>
                  updateItem(section.id, item.id, { endDate: e.target.value })
                }
              />
            </div>
          </div>

          {/* Bullets */}
          <div className="space-y-1.5 pl-2">
            <span className="text-xs text-muted">Bullet points</span>
            {item.bullets.map((bullet, bulletIndex) => (
              <div key={bulletIndex} className="flex items-center gap-1.5">
                <span className="text-light text-xs">•</span>
                <input
                  className={inputClass + " bg-gray-50"}
                  placeholder="Describe an achievement or responsibility..."
                  value={bullet}
                  onChange={(e) =>
                    updateBullet(
                      section.id,
                      item.id,
                      bulletIndex,
                      e.target.value,
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBullet(section.id, item.id);
                    }
                  }}
                />
                <ImproveButton
                  bullet={bullet}
                  role={item.role}
                  company={item.company}
                  onAccept={(text) =>
                    updateBullet(section.id, item.id, bulletIndex, text)
                  }
                />
                <button
                  onClick={() =>
                    removeBullet(section.id, item.id, bulletIndex)
                  }
                  className="text-light hover:text-red-500 transition-colors text-sm shrink-0"
                  title="Remove bullet"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => addBullet(section.id, item.id)}
              className="text-xs text-accent hover:text-primary transition-colors"
            >
              + Add bullet
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={() => addItem(section.id)}
        className="text-xs text-accent hover:text-primary transition-colors"
      >
        + Add experience
      </button>
    </div>
  );
}
