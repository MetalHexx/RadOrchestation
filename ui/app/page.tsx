"use client";

import { useProjects } from "@/hooks/use-projects";
import { useDocumentDrawer } from "@/hooks/use-document-drawer";
import { useConfigDrawer } from "@/hooks/use-config-drawer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ProjectSidebar } from "@/components/sidebar";
import { AppHeader, MainDashboard } from "@/components/layout";
import { DocumentDrawer } from "@/components/documents";
import { ConfigDrawer } from "@/components/config";
import type { ProjectSummary } from "@/types/components";

export default function Home() {
  const {
    projects,
    selectedProject,
    projectState,
    selectProject,
    isLoading,
    error,
    sseStatus,
    reconnect,
  } = useProjects();

  const {
    isOpen,
    docPath,
    loading: docLoading,
    error: docError,
    data: docData,
    openDocument,
    close: closeDocument,
  } = useDocumentDrawer({ projectName: selectedProject });

  const configDrawer = useConfigDrawer();

  const handleDocClick = (path: string) => {
    openDocument(path);
  };

  const selected: ProjectSummary | undefined = projects.find(
    (p) => p.name === selectedProject
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader sseStatus={sseStatus} onReconnect={reconnect} onConfigClick={configDrawer.open} />

      <SidebarProvider>
        <ProjectSidebar
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={selectProject}
          isLoading={isLoading}
        />

        <SidebarInset id="main-content">
          {isLoading && !selected ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading projects…
                </p>
              </div>
            </div>
          ) : error && !selected ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md text-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          ) : selected ? (
            <MainDashboard
              projectState={projectState}
              project={selected}
              onDocClick={handleDocClick}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md text-center">
                <h2 className="mb-2 text-lg font-semibold text-foreground">
                  Orchestration Monitor
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select a project from the sidebar to view its dashboard.
                </p>
              </div>
            </div>
          )}
        </SidebarInset>
      </SidebarProvider>

      <DocumentDrawer
        open={isOpen}
        docPath={docPath}
        loading={docLoading}
        error={docError}
        data={docData}
        onClose={closeDocument}
      />

      <ConfigDrawer
        open={configDrawer.isOpen}
        config={configDrawer.config}
        loading={configDrawer.loading}
        error={configDrawer.error}
        onClose={configDrawer.close}
      />
    </div>
  );
}

