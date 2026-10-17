export function deploymentTarget(root, project, production = false) {
  const stage = production ? "production" : "preview";
  if (production && !root.env?.production)
    throw new Error(
      "Production needs its own explicit configuration and database.",
    );
  const config = { ...root, ...root.env?.[stage] };
  const binding = config.d1_databases?.[0];
  const databaseName = production
    ? project.productionDatabaseName
    : project.databaseName;
  if (
    config.name !== project.projectName ||
    config.vars?.APP_STAGE !== stage ||
    config.vars?.ALLOW_DEV_AUTH !== "false" ||
    !binding ||
    binding.binding !== "DB" ||
    binding.database_name !== databaseName ||
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
      binding.database_id ?? "",
    ) ||
    binding.database_id.startsWith("00000000")
  )
    throw new Error(`Unsafe or unprovisioned ${stage} configuration.`);
  const preview = root.env?.preview?.d1_databases ?? root.d1_databases;
  if (production && binding.database_id === preview?.[0]?.database_id)
    throw new Error("Production and preview must use different D1 databases.");
  return {
    stage,
    config,
    databaseName,
    branch: production ? project.productionBranch : project.previewBranch,
  };
}
