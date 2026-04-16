import { MetaEditor } from "./MetaEditor";
import { SectionList } from "./SectionList";

export function CVEditor() {
  return (
    <div className="p-6 space-y-6">
      <MetaEditor />
      <hr className="border-gray-100" />
      <SectionList />
    </div>
  );
}
