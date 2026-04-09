import { appColors } from "@/shared/ui";

const colors = {
  textPrimary: appColors.textPrimary,
  textSecondary: appColors.textSecondary,
  error: appColors.error,
  errorBackground: appColors.errorBackground,
  errorBorder: appColors.errorBorder,
  surface: appColors.surface,
} as const;

export const dialogStyles = {
  content: {
    background: colors.surface,
    borderRadius: 22,
    padding: "28px 24px",
    width: "90vw",
    maxWidth: 480,
    boxShadow: "0 24px 48px rgba(15, 23, 42, 0.12)",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    margin: "6px 0 0 0",
    lineHeight: 1.45,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  fieldError: {
    fontSize: 13,
    color: colors.error,
    margin: "2px 0 0 0",
  },
  apiError: {
    marginTop: 16,
    padding: "12px 16px",
    borderRadius: 14,
    background: colors.errorBackground,
    border: `1px solid ${colors.errorBorder}`,
    fontSize: 14,
    color: colors.error,
    lineHeight: 1.45,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 24,
  },
} as const;
