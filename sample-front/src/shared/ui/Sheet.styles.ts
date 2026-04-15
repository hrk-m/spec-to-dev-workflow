import { appColors } from "@/shared/ui/theme";

const DEFAULT_SHEET_WIDTH = "90vw";
const FULL_WIDTH = "100vw";
const BASE_Z_INDEX = 100;
const ANIMATION_DURATION = "500ms";
const ANIMATION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const TOP_OFFSET = "calc(var(--header-height) + env(safe-area-inset-top))";
const SHEET_HEIGHT = "calc(100dvh - (var(--header-height) + env(safe-area-inset-top)))";

export const sheetConstants = {
  defaultWidth: DEFAULT_SHEET_WIDTH,
  fullWidth: FULL_WIDTH,
  baseZIndex: BASE_Z_INDEX,
  animationDuration: ANIMATION_DURATION,
  animationEasing: ANIMATION_EASING,
  topOffset: TOP_OFFSET,
  height: SHEET_HEIGHT,
} as const;

export const styles = {
  overlay: {
    position: "fixed" as const,
    top: TOP_OFFSET,
    left: 0,
    width: "100%",
    height: SHEET_HEIGHT,
    background: "rgba(0, 0, 0, 0.4)",
    transition: `opacity ${ANIMATION_DURATION} ease-out`,
  },
  container: {
    position: "fixed" as const,
    top: TOP_OFFSET,
    right: 0,
    width: DEFAULT_SHEET_WIDTH,
    height: SHEET_HEIGHT,
    background: appColors.background,
    boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
    transition: `transform ${ANIMATION_DURATION} ${ANIMATION_EASING}, width ${ANIMATION_DURATION} ${ANIMATION_EASING}`,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 42px",
    flexShrink: 0,
  },
  titleText: {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: -0.7,
    color: appColors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    border: "none",
    background: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    color: appColors.textSecondary,
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
  },
} as const;
