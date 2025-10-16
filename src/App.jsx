import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotificationProvider from "./components/NotificationSystem";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Todos from "./pages/Todos";
import Requests from "./pages/Requests";
// import Meetings from "./pages/Meetings"; // removed user meetings page
import UserAssets from "./pages/UserAssets";

// Admin pages
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTodos from "./pages/admin/AdminTodos";
import AdminRequests from "./pages/admin/AdminRequests";
import AssetManagementTabs from "./pages/admin/AssetManagementTabs";
import AdminMeetings from "./pages/admin/AdminMeetings";
import AdminVisitors from "./pages/admin/AdminVisitors";

// Procurement pages
import ProcurementAssetManagement from "./pages/procurement/ProcurementAssetManagement";

// History page
import HistoryDashboard from "./components/history/HistoryDashboard";

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Role-based route component
const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

// Main App component
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Navigate to="/dashboard" />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />

                  {/* User routes */}
                  <Route
                    path="/todos"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["user"]}>
                          <Layout>
                            <Todos />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/requests"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["user"]}>
                          <Layout>
                            <Requests />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* User meetings route removed */}

                  <Route
                    path="/assets"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["user"]}>
                          <Layout>
                            <UserAssets />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* History route - accessible by all authenticated users */}
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <HistoryDashboard />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin routes */}
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["admin_ga", "admin_ga_manager", "super_admin"]}>
                          <Layout>
                            <AdminUsers />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/todos"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["admin_ga", "admin_ga_manager", "super_admin"]}>
                          <Layout>
                            <AdminTodos />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/requests"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["admin_ga", "admin_ga_manager", "super_admin"]}>
                          <Layout>
                            <AdminRequests />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/asset-management"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["admin_ga", "admin_ga_manager", "super_admin"]}>
                          <Layout>
                            <AssetManagementTabs />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/meetings"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["admin_ga", "admin_ga_manager", "super_admin"]}>
                          <Layout>
                            <AdminMeetings />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/visitors"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["admin_ga", "admin_ga_manager", "super_admin"]}>
                          <Layout>
                            <AdminVisitors />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />


                  {/* Procurement routes */}
                  <Route
                    path="/procurement"
                    element={
                      <ProtectedRoute>
                        <RoleRoute allowedRoles={["procurement", "admin_ga", "admin_ga_manager", "super_admin"]}>
                          <Layout>
                            <ProcurementAssetManagement />
                          </Layout>
                        </RoleRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </div>
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
