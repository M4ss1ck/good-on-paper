export interface FieldChange<T = string> {
  field: string;
  before: T;
  after: T;
}

export interface BulletChange {
  index: number;
  type: "added" | "removed" | "changed";
  before?: string;
  after?: string;
}

export interface ItemDiff {
  itemId: string;
  type: "added" | "removed" | "changed";
  fields: FieldChange[];
  bullets?: BulletChange[];
}

export interface SectionDiff {
  sectionId: string;
  type: "added" | "removed" | "changed";
  titleChange?: FieldChange;
  visibilityChange?: FieldChange<boolean>;
  items: ItemDiff[];
}

export interface MetaDiff {
  fields: FieldChange[];
  linksChanged: boolean;
}

export interface CVDiff {
  leftId: string;
  rightId: string;
  meta: MetaDiff;
  sections: SectionDiff[];
}
