/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_IPFS_GATEWAY?: string;
  readonly VITE_IPFS_API_KEY?: string;
  readonly VITE_CHAINLINK_API_KEY?: string;
  readonly VITE_PYTH_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
