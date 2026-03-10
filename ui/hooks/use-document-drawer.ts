"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { DocumentResponse } from "@/types/components";

interface UseDocumentDrawerOptions {
  /** Project name for constructing the fetch URL */
  projectName: string | null;
}

interface UseDocumentDrawerReturn {
  /** Whether the drawer is currently open */
  isOpen: boolean;
  /** Current document path (relative to project dir), or null */
  docPath: string | null;
  /** True while the document is being fetched */
  loading: boolean;
  /** Error message if fetch failed, or null */
  error: string | null;
  /** Fetched document data, or null */
  data: DocumentResponse | null;
  /** Open the drawer with a specific document path */
  openDocument: (path: string) => void;
  /** Close the drawer and reset state */
  close: () => void;
}

export function useDocumentDrawer({
  projectName,
}: UseDocumentDrawerOptions): UseDocumentDrawerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [docPath, setDocPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DocumentResponse | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const openDocument = useCallback((path: string) => {
    setIsOpen(true);
    setDocPath(path);
    setData(null);
    setError(null);
    setLoading(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Preserve docPath and data so closing animation shows content
  }, []);

  useEffect(() => {
    if (!isOpen || !docPath || !projectName) {
      return;
    }

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    fetch(
      `/api/projects/${encodeURIComponent(projectName)}/document?path=${encodeURIComponent(docPath)}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load document" }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json() as Promise<DocumentResponse>;
      })
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load document");
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [isOpen, docPath, projectName]);

  return {
    isOpen,
    docPath,
    loading,
    error,
    data,
    openDocument,
    close,
  };
}
