'use client';

import React, { createContext, useContext, useState } from 'react';
import type { Project } from './firebase-types';

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  metaConfig: {
    APP_ID?: string;
    GRAPH_API_VERSION?: string;
    EMBEDDED_SIGNUP_CONFIG_ID?: string;
    WEBHOOK_VERIFY_TOKEN?: string;
  };
  wabaConfig: {
    WABA_ID?: string;
    PHONE_NUMBER_ID?: string;
    BUSINESS_TOKEN?: string;
  };
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const metaConfig = currentProject?.metaConfig || {};
  const wabaConfig = currentProject?.waba || {};

  const value: ProjectContextType = {
    currentProject,
    setCurrentProject,
    metaConfig,
    wabaConfig,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject deve ser usado dentro de ProjectProvider');
  }
  return context;
}
