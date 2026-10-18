export type HouseholdRole = "owner" | "guardian";
export const householdRoleLabel = (role: HouseholdRole | null | undefined) =>
  role === "owner"
    ? "管理家长"
    : role === "guardian"
      ? "协助家长"
      : "尚未选择家庭";
export const validHouseholdRole = (role: unknown): role is HouseholdRole =>
  role === "owner" || role === "guardian";
export const validAccessVersion = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) < 2 ** 31;
export const validRequestId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export const validInviteToken = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export interface HouseholdSummary {
  id: string;
  name: string;
  role: HouseholdRole;
}
export interface HouseholdMember {
  id: string;
  username: string;
  role: HouseholdRole;
  self: boolean;
  disabled: boolean;
  needsPasswordChange: boolean;
}
export interface HouseholdInvite {
  id: string;
  username: string;
  role: HouseholdRole;
  createdAt: number;
  expiresAt: number;
}
export interface HouseholdAccess {
  sharingEnabled: boolean;
  current: HouseholdSummary | null;
  contextVersion: number;
  version: number;
  households: HouseholdSummary[];
  members: HouseholdMember[];
  invitations: HouseholdInvite[];
}
export interface InvitePreview {
  id: string;
  householdId: string;
  householdName: string;
  invitedBy: string;
  role: HouseholdRole;
  expiresAt: number;
  version: number;
}
