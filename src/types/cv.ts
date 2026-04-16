export interface CV {
  meta: CVMeta;
  sections: Section[];
}

export interface CVMeta {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: { label: string; url: string }[];
}

export type SectionType =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "languages"
  | "custom";

export interface Section {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
  items: SectionItem[];
}

export interface SummaryItem {
  id: string;
  content: string;
}

export interface SkillItem {
  id: string;
  category: string;
  items: string[];
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  dates: string;
  notes?: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  level: string;
}

export interface CustomItem {
  id: string;
  content: string;
}

export type SectionItem =
  | SummaryItem
  | SkillItem
  | ExperienceItem
  | EducationItem
  | LanguageItem
  | CustomItem;
