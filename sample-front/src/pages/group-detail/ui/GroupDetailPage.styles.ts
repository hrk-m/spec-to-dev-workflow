import { appColors } from "@/shared/ui";

const colors = {
  separator: appColors.separator,
  background: appColors.background,
  surfaceRaised: appColors.surfaceRaised,
  textPrimary: appColors.textPrimary,
  textSecondary: appColors.textSecondary,
  textTertiary: appColors.textTertiary,
  accent: appColors.accent,
  accentSoft: appColors.accentSoft,
  searchBackground: appColors.searchBackground,
} as const;

export const styles = {
  container: {
    width: "100%",
    padding: "22px 16px 36px",
  },
  content: {
    width: "100%",
  },
  backButton: {
    fontSize: 15,
    fontWeight: 500,
    color: colors.accent,
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: "4px 0",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  heroSection: {
    paddingBottom: 6,
    marginTop: 12,
  },
  pageTitle: {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: -0.7,
    color: colors.textPrimary,
    margin: "6px 0 0 0",
    lineHeight: 1.02,
  },
  pageDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    margin: "8px 0 0 0",
    lineHeight: 1.5,
  },
  memberBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    padding: "4px 12px",
    fontSize: 13,
    fontWeight: 500,
    color: colors.textSecondary,
    background: colors.searchBackground,
    borderRadius: 999,
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
