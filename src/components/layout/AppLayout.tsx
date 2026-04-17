import { CVEditor } from "../editor/CVEditor";
import { CVPreview } from "../preview/CVPreview";
import { Toolbar } from "./Toolbar";
import { PdfPreviewModal } from "../pdf/PdfPreviewModal";
import { useUIStore } from "../../store/uiStore";
import { Trans } from "@lingui/react/macro";

export function AppLayout() {
  const mobilePanel = useUIStore((s) => s.mobilePanel);
  const setMobilePanel = useUIStore((s) => s.setMobilePanel);

  return (
    <div className="flex flex-col h-dvh">
      <Toolbar />
      {/* Mobile panel toggle */}
      <div className="flex md:hidden border-b border-gray-200 bg-white">
        <button
          className={`flex-1 py-2 text-sm font-medium transition-colors ${mobilePanel === "editor" ? "text-accent border-b-2 border-accent" : "text-muted"}`}
          onClick={() => setMobilePanel("editor")}
        >
          <Trans>Editor</Trans>
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium transition-colors ${mobilePanel === "preview" ? "text-accent border-b-2 border-accent" : "text-muted"}`}
          onClick={() => setMobilePanel("preview")}
        >
          <Trans context="tab">Preview</Trans>
        </button>
      </div>
      {/* Desktop: side-by-side, Mobile: toggle */}
      <div className="flex flex-1 overflow-hidden">
        <div className={`w-full md:w-[45%] overflow-y-auto md:border-r md:border-gray-200 bg-white ${mobilePanel !== "editor" ? "hidden md:block" : ""}`}>
          <CVEditor />
        </div>
        <div className={`w-full md:w-[55%] overflow-y-auto bg-background ${mobilePanel !== "preview" ? "hidden md:block" : ""}`}>
          <CVPreview />
        </div>
      </div>
      <PdfPreviewModal />
    </div>
  );
}
