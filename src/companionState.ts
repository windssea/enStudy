import type { Identity } from "../packages/contracts/index";
import type { CompanionChoice } from "../packages/domain/companions";
/** Late callbacks must not cross profiles or replace a more recent choice. */
export function applyCompanionChoice(
  identity: Identity,
  choice: CompanionChoice,
): Identity {
  const child = identity.child;
  if (
    !child ||
    child.id !== choice.childId ||
    (child.companionVersion ?? 0) > choice.version
  )
    return identity;
  if (
    child.companionId === choice.companionId &&
    child.companionVersion === choice.version
  )
    return identity;
  return {
    ...identity,
    child: {
      ...child,
      companionId: choice.companionId,
      companionVersion: choice.version,
    },
  };
}
