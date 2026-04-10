import { appColors } from "@/shared/ui";

const colors = {
  background: appColors.headerBackground,
  border: appColors.separator,
  shadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
  title: appColors.textPrimary,
  avatarBackground: appColors.accentSoft,
  avatarText: appColors.accent,
} as const;

export const styles = {
  header: {
    background: colors.background,
    borderBottom: `1px solid ${colors.border}`,
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 150,
    paddingTop: "env(safe-area-inset-top)",
    backdropFilter: "blur(28px) saturate(140%)",
    WebkitBackdropFilter: "blur(28px) saturate(140%)",
    boxShadow: colors.shadow,
  },
  inner: {
    height: 52,
    padding: "0 24px",
    display: "grid",
    gridTemplateColumns: "40px 1fr 40px",
    alignItems: "center",
    gap: 12,
  },
  leading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    color: colors.title,
  },
  menuIcon: {
    width: 16,
    height: 16,
    display: "block",
    transform: "translateY(0.5px)",
  },
  title: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: -0.2,
    lineHeight: 1.1,
    color: colors.title,
  },
  trailing: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  accountAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.avatarBackground,
    color: colors.avatarText,
    boxShadow: "inset 0 0 0 1px rgba(0, 122, 255, 0.08)",
  },
  accountInitials: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: -0.1,
  },
} as const;
