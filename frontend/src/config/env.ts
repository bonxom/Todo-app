export interface AppEnv {
  serverUrl: string | undefined;
  apiDebug: boolean;
}

type EnvSource = Partial<Pick<ImportMetaEnv, "VITE_SERVER_URL" | "VITE_API_DEBUG">>;

export const parseEnv = (source: EnvSource): AppEnv => ({
  serverUrl: source.VITE_SERVER_URL?.trim() || undefined,
  apiDebug: source.VITE_API_DEBUG === "true",
});

export const env = parseEnv(import.meta.env);
