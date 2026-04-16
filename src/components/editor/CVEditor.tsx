import { Trans } from "@lingui/react/macro";
import { MetaEditor } from "./MetaEditor";
import { SectionList } from "./SectionList";
import { useCVStore } from "../../store/cvStore";
import type { FontFamily } from "../../types/cv";

const FONT_OPTIONS: { value: FontFamily; label: string; cls: string }[] = [
  { value: "Roboto", label: "Roboto", cls: "font-sans" },
  { value: "Inter", label: "Inter", cls: "font-[Inter]" },
  { value: "Lora", label: "Lora", cls: "font-[Lora]" },
];

export function CVEditor() {
  const fontFamily = useCVStore(
    (s) => s.activeCv()?.settings?.fontFamily ?? "Roboto",
  );
  const updateSettings = useCVStore((s) => s.updateSettings);

  return (
    <div className="p-6 space-y-6">
      <MetaEditor />

      <div>
        <label className="text-xs font-medium text-muted block mb-1">
          <Trans>Font</Trans>
        </label>
        <select
          className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-accent transition-colors"
          value={fontFamily}
          onChange={(e) =>
            updateSettings({ fontFamily: e.target.value as FontFamily })
          }
        >
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className={opt.cls}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <hr className="border-gray-100" />
      <SectionList />
    </div>
  );
}
