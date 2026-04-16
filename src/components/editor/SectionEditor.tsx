import type { Section } from "../../types/cv";
import { SummaryEditor } from "./SummaryEditor";
import { SkillsEditor } from "./SkillsEditor";
import { ExperienceEditor } from "./ExperienceEditor";
import { EducationEditor } from "./EducationEditor";
import { LanguagesEditor } from "./LanguagesEditor";
import { CustomEditor } from "./CustomEditor";

export function SectionEditor({ section }: { section: Section }) {
  switch (section.type) {
    case "summary":
      return <SummaryEditor section={section} />;
    case "skills":
      return <SkillsEditor section={section} />;
    case "experience":
      return <ExperienceEditor section={section} />;
    case "education":
      return <EducationEditor section={section} />;
    case "languages":
      return <LanguagesEditor section={section} />;
    case "custom":
      return <CustomEditor section={section} />;
  }
}
