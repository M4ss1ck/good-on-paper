import { useCVStore } from "../../store/cvStore";

export function MetaEditor() {
  const meta = useCVStore((s) => s.activeCv()?.meta);
  const updateMeta = useCVStore((s) => s.updateMeta);

  if (!meta) return null;

  const addLink = () => {
    updateMeta({ links: [...meta.links, { label: "", url: "" }] });
  };

  const updateLink = (
    index: number,
    field: "label" | "url",
    value: string,
  ) => {
    const links = meta.links.map((link, i) =>
      i === index ? { ...link, [field]: value } : link,
    );
    updateMeta({ links });
  };

  const removeLink = (index: number) => {
    updateMeta({ links: meta.links.filter((_, i) => i !== index) });
  };

  const inputClass =
    "w-full border-b border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors bg-transparent";

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">
        Personal Information
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <input
          className={inputClass}
          placeholder="Full Name"
          value={meta.name}
          onChange={(e) => updateMeta({ name: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Job Title"
          value={meta.title}
          onChange={(e) => updateMeta({ title: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Email"
          type="email"
          value={meta.email}
          onChange={(e) => updateMeta({ email: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Phone"
          type="tel"
          value={meta.phone}
          onChange={(e) => updateMeta({ phone: e.target.value })}
        />
        <input
          className={inputClass + " col-span-2"}
          placeholder="Location"
          value={meta.location}
          onChange={(e) => updateMeta({ location: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Links</span>
          <button
            onClick={addLink}
            className="text-xs text-accent hover:text-primary transition-colors"
          >
            + Add link
          </button>
        </div>
        {meta.links.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className={inputClass}
              placeholder="Label (e.g. LinkedIn)"
              value={link.label}
              onChange={(e) => updateLink(index, "label", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="URL"
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
            />
            <button
              onClick={() => removeLink(index)}
              className="text-light hover:text-red-500 transition-colors text-sm shrink-0"
              title="Remove link"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
