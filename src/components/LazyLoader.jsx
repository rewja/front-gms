import React, { Suspense, lazy } from "react";
import SkeletonLoader from "./SkeletonLoader";

// Lazy load components
export const LazyTodos = lazy(() => import("../pages/Todos"));
export const LazyRequests = lazy(() => import("../pages/Requests"));
export const LazyMeetings = lazy(() => import("../pages/Meetings"));
export const LazyUserAssets = lazy(() => import("../pages/UserAssets"));
export const LazyDashboard = lazy(() => import("../pages/Dashboard"));

// Admin components
export const LazyAdminUsers = lazy(() => import("../pages/admin/AdminUsers"));
export const LazyAdminTodos = lazy(() => import("../pages/admin/AdminTodos"));
export const LazyAdminRequests = lazy(() =>
  import("../pages/admin/AdminRequests")
);
export const LazyAssetManagementTabs = lazy(() =>
  import("../pages/admin/AssetManagementTabs")
);
export const LazyAdminMeetings = lazy(() =>
  import("../pages/admin/AdminMeetings")
);
export const LazyAdminVisitors = lazy(() =>
  import("../pages/admin/AdminVisitors")
);

// Procurement components
export const LazyProcurementAssetManagement = lazy(() =>
  import("../pages/procurement/ProcurementAssetManagement")
);

// Lazy wrapper component
export const LazyWrapper = ({
  children,
  fallback = <SkeletonLoader type="card" lines={3} />,
  ...props
}) => {
  return (
    <Suspense fallback={fallback} {...props}>
      {children}
    </Suspense>
  );
};

// Higher-order component for lazy loading
export const withLazyLoading = (Component, fallback = null) => {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));

  return (props) => (
    <Suspense fallback={fallback || <SkeletonLoader type="card" lines={3} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Lazy load with custom loading component
export const LazyLoadWithCustomFallback = ({
  children,
  loadingComponent,
  delay = 200,
}) => {
  const [showFallback, setShowFallback] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Suspense fallback={showFallback ? loadingComponent : null}>
      {children}
    </Suspense>
  );
};

export default LazyWrapper;
