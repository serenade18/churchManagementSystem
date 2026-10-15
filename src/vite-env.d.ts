/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_CHURCH_NAME?: string
  readonly VITE_PAYBILL_NUMBER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
