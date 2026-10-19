export function aiHostPlan(raw: string): { value: string; fingerprint: string };
export function configureCloudflareAiHosts(input: {
  env: Record<string, string | undefined>;
  project: { projectName: string; productionBranch: string };
  stage: string;
  databaseId: string;
  fetcher?: typeof fetch;
}): Promise<{ operation: string }>;
