import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSavedJobIds, toggleSavedJob as toggleSavedJobAPI } from "../services/api";
import { useAuth } from "./useAuth";
import toast from "react-hot-toast";

const SavedJobsContext = createContext({
  savedIds: new Set(),
  isSaved: () => false,
  toggle: () => {},
  loading: false,
});

export function SavedJobsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch saved IDs when authenticated
  const fetchIds = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedIds(new Set());
      return;
    }

    try {
      setLoading(true);
      const res = await getSavedJobIds();
      setSavedIds(new Set(res.data?.savedJobIds || []));
    } catch {
      // silent — user just won't see saved state
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchIds();
  }, [fetchIds]);

  const isSaved = useCallback((jobId) => savedIds.has(jobId), [savedIds]);

  const toggle = useCallback(
    async (jobId) => {
      if (!isAuthenticated) {
        toast.error("Please log in to save jobs");
        return;
      }

      // Optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(jobId)) {
          next.delete(jobId);
        } else {
          next.add(jobId);
        }
        return next;
      });

      try {
        const res = await toggleSavedJobAPI(jobId);
        // Sync with server truth
        setSavedIds(new Set((res.data?.savedJobs || []).map((id) => id.toString())));
        toast.success(res.data?.saved ? "Job saved" : "Job unsaved", { duration: 1500 });
      } catch {
        // Revert optimistic update
        fetchIds();
        toast.error("Failed to update saved jobs");
      }
    },
    [isAuthenticated, fetchIds],
  );

  const value = useMemo(
    () => ({ savedIds, isSaved, toggle, loading }),
    [savedIds, isSaved, toggle, loading],
  );

  return (
    <SavedJobsContext.Provider value={value}>
      {children}
    </SavedJobsContext.Provider>
  );
}

export const useSavedJobs = () => useContext(SavedJobsContext);
