/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string; // Example: Define your specific environment variables here
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}