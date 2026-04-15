import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FaChevronRight } from "react-icons/fa6";

import { sheetConstants, styles } from "./Sheet.styles";

type SheetProps = {
  children: ReactNode;
  onClose: () => void;
  onRemove: () => void;
  closing?: boolean;
  isTopMost?: boolean;
  zIndex?: number;
  width?: CSSProperties["width"];
  title?: string;
  headerActions?: ReactNode;
};

export function Sheet({
  children,
  onClose,
  onRemove,
  closing = false,
  isTopMost = true,
  zIndex = sheetConstants.baseZIndex,
  width = sheetConstants.defaultWidth,
  title,
  headerActions,
}: SheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!closing) {
      const prev = document.body.style.overflowY;
      document.body.style.overflowY = "hidden";
      return () => {
        document.body.style.overflowY = prev;
      };
    }
  }, [closing]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isTopMost && !closing) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closing, isTopMost, onClose]);

  const handleTransitionEnd = useCallback(() => {
    if (closing) {
      onRemove();
    }
  }, [closing, onRemove]);

  const transform = closing ? "translateX(100%)" : mounted ? "translateX(0)" : "translateX(100%)";
  const overlayOpacity = closing ? 0 : mounted ? 1 : 0;
  const portalContainer = document.querySelector<HTMLElement>(".radix-themes") ?? document.body;

  return createPortal(
    <>
      <div
        style={{ ...styles.overlay, zIndex, opacity: overlayOpacity }}
        onClick={onClose}
        role="presentation"
        data-testid="sheet-overlay"
      />
      <div
        style={{
          ...styles.container,
          zIndex: zIndex + 1,
          width,
          transform,
          overscrollBehavior: "contain",
        }}
        role="dialog"
        aria-modal="true"
        onTransitionEnd={handleTransitionEnd}
      >
        <div style={styles.header}>
          {title ? <span style={styles.titleText}>{title}</span> : <span />}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {headerActions}
            <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Close">
              <FaChevronRight size={14} />
            </button>
          </div>
        </div>
        <div style={styles.content}>{children}</div>
      </div>
    </>,
    portalContainer,
  );
}
