export const exportSections = [
  ["family", "家庭"],
  ["members", "家长与家庭角色"],
  ["children", "儿童档案"],
  ["companions", "伙伴选择"],
  ["sessions", "学习轮次"],
  ["assignments", "题目与展示版本"],
  ["attempts", "作答与反馈"],
  ["results", "完成记录"],
  ["reviews", "复习状态"],
  ["rewards", "奖励记录"],
  ["training", "专题计划"],
  ["training_phases", "专题步骤"],
  ["demonstrations", "示范记录"],
  ["listening", "听音与文字辅助"],
  ["writing", "写作作品"],
  ["ai_settings", "AI设置"],
  ["voice_settings", "语音设置"],
  ["connections", "连接说明（无密钥）"],
  ["ai_usage", "AI用量"],
  ["daily_budget", "家庭用量计数"],
  ["child_budget", "儿童用量计数"],
  ["voice_budget", "语音用量计数"],
  ["legacy_training", "早期专题记录"],
  ["invitations", "家长邀请记录（无邀请码）"],
  ["membership_history", "家庭成员变更记录"],
] as const;
export type ExportSection = (typeof exportSections)[number][0];
export interface ExportJob {
  id: string;
  createdAt: number;
  expiresAt: number;
  rows: number;
  parts: number;
  dataBytes: number;
}
export interface ExportPart {
  section: ExportSection;
  part: number;
  rows: number;
  dataBytes: number;
}
export interface ExportManifest {
  format: "english-quest-data";
  schema: 1;
  job: ExportJob;
  sections: { id: ExportSection; label: string; rows: number; parts: number }[];
  parts: ExportPart[];
  excluded: string[];
}
export interface ExportPartData {
  format: "english-quest-data";
  schema: 1;
  jobId: string;
  section: ExportSection;
  part: number;
  records: Record<string, unknown>[];
}
