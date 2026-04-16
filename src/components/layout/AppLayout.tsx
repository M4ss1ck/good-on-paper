import { CVEditor } from "../editor/CVEditor";

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <div className="w-[45%] overflow-y-auto border-r border-gray-200 bg-white">
        <CVEditor />
      </div>
      <div className="w-[55%] overflow-y-auto bg-background">
        <div className="flex items-start justify-center p-8">
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-page shadow-sm rounded p-12">
            <p className="text-center text-light text-sm">
              Preview will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
