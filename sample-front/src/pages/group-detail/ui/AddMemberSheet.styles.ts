import { appColors } from "@/shared/ui";

const colors = {
  separator: appColors.separator,
  surfaceRaised: appColors.surfaceRaised,
  textPrimary: appColors.textPrimary,
  textSecondary: appColors.textSecondary,
  textTertiary: appColors.textTertiary,
  searchBackground: appColors.searchBackground,
  error: appColors.error,
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
  tableRoot: {
    width: "100%",
    borderCollapse: "collapse" as const,
    background: colors.surfaceRaised,
    border: `1px solid ${colors.separator}`,
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.06)",
    marginTop: 12,
  },
  tableHeader: {
    background: colors.surfaceRaised,
  },
  tableHeaderCell: {
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: colors.textTertiary,
    textAlign: "left" as const,
    borderBottom: `1px solid ${colors.separator}`,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  tableHeaderCellCheckbox: {
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: colors.textTertiary,
    textAlign: "left" as const,
    borderBottom: `1px solid ${colors.separator}`,
    width: 48,
  },
  tableRow: {
    borderBottom: `1px solid ${colors.separator}`,
    cursor: "pointer",
  },
  tableRowLast: {
    cursor: "pointer",
  },
  tableCellCheckbox: {
    padding: "13px 16px",
    verticalAlign: "middle" as const,
    width: 48,
  },
  tableCellName: {
    padding: "13px 16px",
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
    verticalAlign: "middle" as const,
  },
  errorText: {
    margin: "12px 0 0",
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.error,
    padding: "12px 16px",
    background: appColors.errorBackground,
    borderRadius: 12,
    border: `1px solid ${appColors.errorBorder}`,
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
    borderBottom: `1px solid ${colors.separator}`,
  },
  skeletonCell: {
    padding: "13px 16px",
    verticalAlign: "middle" as const,
  },
  skeletonLine: {
    background: "rgba(118, 118, 128, 0.16)",
    borderRadius: 999,
    height: 14,
    width: "60%",
  },
} as const;
