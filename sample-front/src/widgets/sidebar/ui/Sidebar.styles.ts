import { appColors } from "@/shared/ui";

const SIDEBAR_WIDTH = 260;
export const TRANSITION_DURATION_MS = 420;
const TRANSITION_DURATION = `${TRANSITION_DURATION_MS}ms`;
const PANEL_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const OVERLAY_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const colors = {
  background: appColors.sidebarBackground,
  border: appColors.separator,
  menuText: appColors.textPrimary,
  menuSecondary: appColors.textSecondary,
  menuSurface: appColors.menuSurface,
  accent: appColors.accent,
  overlay: "rgba(15, 23, 42, 0.18)",
} as const;

export const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: colors.overlay,
    zIndex: 199,
    opacity: 0,
    transition: `opacity 260ms ${OVERLAY_EASING}`,
  },
  nav: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    background: colors.background,
    borderRight: `1px solid ${colors.border}`,
    zIndex: 200,
    overflowY: "auto" as const,
    opacity: 0,
    transition: [
      `transform ${TRANSITION_DURATION} ${PANEL_EASING}`,
      `opacity 240ms ${OVERLAY_EASING}`,
      `box-shadow ${TRANSITION_DURATION} ${PANEL_EASING}`,
    ].join(", "),
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
    padding: "calc(18px + env(safe-area-inset-top)) 14px calc(24px + env(safe-area-inset-bottom))",
    willChange: "transform, opacity",
  },
  panel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    minHeight: "100%",
  },
  menuSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.menuSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
    padding: "0 6px",
  },
  homeItem: {
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
    color: colors.menuText,
    background: colors.menuSurface,
    border: `1px solid ${colors.border}`,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
  },
  homeItemLabel: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  navIcon: {
    width: 16,
    height: 16,
    display: "block",
    flexShrink: 0,
  },
  chevron: {
    width: 14,
    height: 14,
    display: "block",
    color: colors.menuSecondary,
  },
} as const;
