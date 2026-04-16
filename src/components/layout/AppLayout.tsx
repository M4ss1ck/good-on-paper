import { CVEditor } from "../editor/CVEditor";
import { CVPreview } from "../preview/CVPreview";
import { Toolbar } from "./Toolbar";
import { PdfPreviewModal } from "../pdf/PdfPreviewModal";

export function AppLayout() {
  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[45%] overflow-y-auto border-r border-gray-200 bg-white">
          <CVEditor />
        </div>
        <div className="w-[55%] overflow-y-auto bg-background">
          <CVPreview />
        </div>
      </div>
      <PdfPreviewModal />
    </div>
  );
}
