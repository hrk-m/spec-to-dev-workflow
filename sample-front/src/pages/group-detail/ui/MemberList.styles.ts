import { appColors } from "@/shared/ui";

const colors = {
  separator: appColors.separator,
  surfaceRaised: appColors.surfaceRaised,
  textPrimary: appColors.textPrimary,
  textSecondary: appColors.textSecondary,
  textTertiary: appColors.textTertiary,
  accent: appColors.accent,
  accentSoft: appColors.accentSoft,
  searchBackground: appColors.searchBackground,
} as const;

export const styles = {
  searchSection: {
    marginTop: 18,
  },
  searchField: {
    width: "100%",
    boxSizing: "border-box" as const,
    background: colors.searchBackground,
    borderRadius: 16,
    boxShadow: `inset 0 0 0 1px ${colors.separator}`,
  },
  searchFieldIcon: {
    width: 18,
    height: 18,
    display: "block",
    color: colors.textSecondary,
  },
  listCard: {
    marginTop: 12,
    background: colors.surfaceRaised,
    border: `1px solid ${colors.separator}`,
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.06)",
  },
  memberRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
  },
  memberRowBorder: {
    borderBottom: `1px solid ${colors.separator}`,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: colors.accentSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 14,
    fontWeight: 600,
    color: colors.accent,
  },
  memberName: {
    margin: 0,
    fontSize: 15,
    fontWeight: 500,
    color: colors.textPrimary,
  },
  errorText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.textSecondary,
    textAlign: "center" as const,
    padding: "28px 24px",
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.textSecondary,
    textAlign: "center" as const,
    padding: "28px 24px",
  },
  skeletonRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(118, 118, 128, 0.16)",
    flexShrink: 0,
  },
  skeletonLine: {
    background: "rgba(118, 118, 128, 0.16)",
    borderRadius: 999,
    height: 14,
    width: "60%",
  },
} as const;
