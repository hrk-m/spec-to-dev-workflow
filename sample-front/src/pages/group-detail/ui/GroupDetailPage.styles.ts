import { appColors } from "@/shared/ui";

const colors = {
  separator: appColors.separator,
  surfaceRaised: appColors.surfaceRaised,
  textPrimary: appColors.textPrimary,
  textSecondary: appColors.textSecondary,
  textTertiary: appColors.textTertiary,
  accent: appColors.accent,
} as const;

export const styles = {
  content: {
    width: "100%",
  },
  backButton: {
    fontSize: 16,
    fontWeight: 500,
    color: colors.textSecondary,
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: "4px 0",
    display: "inline-flex",
    alignItems: "center",
    height: 32,
    gap: 4,
  },
  sectionCard: {
    marginTop: 26,
    background: colors.surfaceRaised,
    border: `1px solid ${colors.separator}`,
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.06)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    marginTop: 26,
    flexWrap: "wrap" as const,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionMeta: {
    margin: 0,
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoRow: {
    padding: "14px 20px",
  },
  infoRowBorder: {
    borderBottom: `1px solid ${colors.separator}`,
  },
  infoLabel: {
    margin: 0,
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: 400,
  },
  infoValue: {
    margin: "2px 0 0 0",
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
  skeletonBlock: {
    padding: "18px 20px",
  },
  skeletonLine: {
    background: "rgba(118, 118, 128, 0.16)",
    borderRadius: 999,
    height: 12,
  },
} as const;
