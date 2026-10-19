export interface AiKeyStorePlan {
  activeKeyId: string;
  keys: Record<string, string>;
  fingerprint: string;
  marker: string;
}
export function aiKeyStorePlan(
  raw: string,
  accountId: string,
  projectName: string,
  stage: string,
): AiKeyStorePlan;
export function configureCloudflareAi(input: {
  env: Record<string, string | undefined>;
  project: { projectName: string; productionBranch: string };
  stage: string;
  databaseId: string;
  fetcher?: typeof fetch;
}): Promise<{ configured: boolean; operation: string }>;
