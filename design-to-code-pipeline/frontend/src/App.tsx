import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PipelineSocketProvider } from "./context/PipelineSocket";
import { JobDetailPanelPage } from "./pages/JobDetailPanelPage";
import { JobPlaceholderPage } from "./pages/JobPlaceholderPage";
import { JobsWorkspace } from "./pages/JobsWorkspace";
import { NewJobPanelPage } from "./pages/NewJobPanelPage";

export function App() {
  return (
    <PipelineSocketProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/jobs" replace />} />
            <Route path="/jobs" element={<JobsWorkspace />}>
              <Route index element={<JobPlaceholderPage />} />
              <Route path="new" element={<NewJobPanelPage />} />
              <Route path=":jobId" element={<JobDetailPanelPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </PipelineSocketProvider>
  );
}
