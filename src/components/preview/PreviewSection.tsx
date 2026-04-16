import type {
  Section,
  SummaryItem,
  SkillItem,
  ExperienceItem,
  EducationItem,
  LanguageItem,
  CustomItem,
} from "../../types/cv";

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mt-5 mb-2">
      <h2 className="text-[11pt] font-bold text-primary uppercase tracking-wide">
        {title}
      </h2>
      <hr className="border-t border-primary/30 mt-1" />
    </div>
  );
}

function SummaryPreview({ items }: { items: SummaryItem[] }) {
  return (
    <>
      {items.map((item) =>
        item.content ? (
          <p key={item.id} className="text-[10pt] text-gray-800 text-justify leading-relaxed">
            {item.content}
          </p>
        ) : null,
      )}
    </>
  );
}

function SkillsPreview({ items }: { items: SkillItem[] }) {
  return (
    <div className="space-y-1">
      {items.map((item) =>
        item.category || item.items.filter(Boolean).length > 0 ? (
          <p key={item.id} className="text-[10pt] text-gray-800">
            <span className="font-semibold">{item.category}:</span>{" "}
            {item.items.filter(Boolean).join(", ")}
          </p>
        ) : null,
      )}
    </div>
  );
}

function ExperiencePreview({ items }: { items: ExperienceItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id}>
          <div className="flex justify-between items-baseline">
            <span className="text-[10.5pt] font-bold text-gray-900">
              {item.role}
            </span>
            {(item.startDate || item.endDate) && (
              <span className="text-[9pt] text-light">
                {item.startDate}
                {item.startDate && item.endDate && " – "}
                {item.endDate}
              </span>
            )}
          </div>
          {(item.company || item.location) && (
            <p className="text-[10pt] italic text-accent">
              {item.company}
              {item.company && item.location && ", "}
              {item.location}
            </p>
          )}
          {item.bullets.filter(Boolean).length > 0 && (
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              {item.bullets.filter(Boolean).map((bullet, i) => (
                <li key={i} className="text-[9.5pt] text-gray-800">
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function EducationPreview({ items }: { items: EducationItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id}>
          <div className="flex justify-between items-baseline">
            <span className="text-[10.5pt] font-bold text-gray-900">
              {item.degree}
            </span>
            {item.dates && (
              <span className="text-[9pt] text-light">{item.dates}</span>
            )}
          </div>
          {item.institution && (
            <p className="text-[10pt] italic text-accent">{item.institution}</p>
          )}
          {item.notes && (
            <p className="text-[9.5pt] text-gray-700 mt-0.5">{item.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function LanguagesPreview({ items }: { items: LanguageItem[] }) {
  const filled = items.filter((i) => i.language);
  if (filled.length === 0) return null;
  return (
    <p className="text-[10pt] text-gray-800">
      {filled.map((item, i) => (
        <span key={item.id}>
          {i > 0 && " · "}
          <span className="font-semibold">{item.language}</span>
          {item.level && ` (${item.level})`}
        </span>
      ))}
    </p>
  );
}

function CustomPreview({ items }: { items: CustomItem[] }) {
  return (
    <>
      {items.map((item) =>
        item.content ? (
          <p key={item.id} className="text-[10pt] text-gray-800 whitespace-pre-wrap">
            {item.content}
          </p>
        ) : null,
      )}
    </>
  );
}

export function PreviewSection({ section }: { section: Section }) {
  return (
    <div>
      <SectionHeading title={section.title} />
      {section.type === "summary" && <SummaryPreview items={section.items as SummaryItem[]} />}
      {section.type === "skills" && <SkillsPreview items={section.items as SkillItem[]} />}
      {section.type === "experience" && <ExperiencePreview items={section.items as ExperienceItem[]} />}
      {section.type === "education" && <EducationPreview items={section.items as EducationItem[]} />}
      {section.type === "languages" && <LanguagesPreview items={section.items as LanguageItem[]} />}
      {section.type === "custom" && <CustomPreview items={section.items as CustomItem[]} />}
    </div>
  );
}
