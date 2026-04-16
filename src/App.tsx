import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Trans } from "@lingui/react/macro";
import { AppLayout } from "./components/layout/AppLayout";
import { LandingPage } from "./components/landing/LandingPage";
import { useCVStore } from "./store/cvStore";
import { useUIStore } from "./store/uiStore";

const LAST_PAGE_KEY = "gop-last-page";

function EditorRoute() {
  const loadFromStorage = useCVStore((s) => s.loadFromStorage);
  const storageError = useUIStore((s) => s.storageError);
  const setStorageError = useUIStore((s) => s.setStorageError);

  useEffect(() => {
    localStorage.setItem(LAST_PAGE_KEY, "/editor");
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <>
      <AppLayout />
      {storageError && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50"
          onClick={() => setStorageError(null)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-96 max-w-[90vw] p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-red-600"><Trans>Storage Error</Trans></h2>
            <p className="text-sm text-muted">{storageError}</p>
            <button
              onClick={() => setStorageError(null)}
              className="px-3 py-1.5 text-sm rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Trans>OK</Trans>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function HomeRoute() {
  if (localStorage.getItem(LAST_PAGE_KEY) === "/editor") {
    return <Navigate to="/editor" replace />;
  }
  return <LandingPage />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/editor" element={<EditorRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

