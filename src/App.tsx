import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { useCVStore } from "./store/cvStore";

function App() {
  const loadFromStorage = useCVStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return <AppLayout />;
}

export default App;

