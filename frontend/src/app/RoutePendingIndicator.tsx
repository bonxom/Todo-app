import { useNavigation } from "react-router-dom";
import { Loader2 } from "lucide-react";

function useSafeNavigation() {
  try {
    return useNavigation();
  } catch {
    return { state: "idle" as const };
  }
}

export default function RoutePendingIndicator() {
  const navigation = useSafeNavigation();
  const isNavigating = navigation.state !== "idle";

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
    >
      <div className="h-0.5 bg-[var(--color-accent,#0284c7)] animate-pulse w-full" />
      <div className="fixed top-4 right-4 bg-black/60 backdrop-blur-md text-white p-2 rounded-full shadow-lg">
        <Loader2 className="animate-spin w-4 h-4" />
      </div>
    </div>
  );
}
