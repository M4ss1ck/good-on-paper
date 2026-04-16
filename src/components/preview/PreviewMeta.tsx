import type { CVMeta } from "../../types/cv";

export function PreviewMeta({ meta }: { meta: CVMeta }) {
  const contactParts: string[] = [];
  if (meta.email) contactParts.push(meta.email);
  if (meta.phone) contactParts.push(meta.phone);
  if (meta.location) contactParts.push(meta.location);

  const hasContent = meta.name || meta.title || contactParts.length > 0 || meta.links.length > 0;
  if (!hasContent) return null;

  return (
    <div className="text-center mb-6">
      {meta.name && (
        <h1 className="text-[20pt] font-bold text-primary leading-tight">
          {meta.name}
        </h1>
      )}
      {meta.title && (
        <p className="text-[12pt] text-accent mt-1">{meta.title}</p>
      )}
      {contactParts.length > 0 && (
        <p className="text-[9pt] text-muted mt-2">
          {contactParts.join(" · ")}
        </p>
      )}
      {meta.links.length > 0 && (
        <p className="text-[9pt] text-accent mt-1">
          {meta.links
            .filter((l) => l.label || l.url)
            .map((link, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {link.url ? (
                  <a href={link.url} className="hover:underline">
                    {link.label || link.url}
                  </a>
                ) : (
                  link.label
                )}
              </span>
            ))}
        </p>
      )}
    </div>
  );
}
