import { RouterProvider } from "react-router-dom";
import CustomCursor from "../shared/components/CustomCursor";
import ErrorBoundary from "../shared/components/ErrorBoundary";
import { QueryProvider } from "./QueryProvider";
import { AuthCacheBoundary } from "./AuthCacheBoundary";
import { AuthBootstrap } from "./AuthBootstrap";
import { browserRouter } from "./router";

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthCacheBoundary>
          <AuthBootstrap>
            <CustomCursor />
            <RouterProvider router={browserRouter} />
          </AuthBootstrap>
        </AuthCacheBoundary>
      </QueryProvider>
    </ErrorBoundary>
  );
}
