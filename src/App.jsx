// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import AppShell from "./components/layout/AppShell";
import ZedCalculator from "./features/zed/ZedCalculator";
import ListingsPage from "./features/listings/ListingsPage";
import JumpseatPage from "./features/jumpseat/JumpseatPage";
import PassbookPage from "./features/passbook/PassbookPage";
import LoginPage from "./features/auth/LoginPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c18] flex items-center justify-center">
        <span className="h-6 w-6 rounded-full border-2 border-white/20 border-t-sky-400 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — wrapped in AppShell */}
        <Route path="/*" element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/"         element={<Navigate to="/zed" replace />} />
                <Route path="/zed"      element={<ZedCalculator />} />
                <Route path="/listings" element={<ListingsPage />} />
                <Route path="/jumpseat" element={<JumpseatPage />} />
                <Route path="/passbook" element={<PassbookPage />} />
                <Route path="*"         element={<NotFound />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="font-display text-2xl font-black text-white">404</div>
      <div className="text-sm text-white/40">Page not found</div>
    </div>
  );
}
