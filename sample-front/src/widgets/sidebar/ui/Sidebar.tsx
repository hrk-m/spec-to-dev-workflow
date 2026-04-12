import { useEffect, useState, type CSSProperties } from "react";
import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { FaChevronRight, FaHouse, FaUsers } from "react-icons/fa6";

import { styles, TRANSITION_DURATION_MS } from "./Sidebar.styles";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export function Sidebar({ isOpen, onClose, onNavigate }: SidebarProps) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    let frameId = 0;
    let timeoutId = 0;

    if (isOpen) {
      setIsMounted(true);
      frameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else if (isMounted) {
      setIsVisible(false);
      timeoutId = window.setTimeout(() => {
        setIsMounted(false);
      }, TRANSITION_DURATION_MS);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMounted, onClose]);

  if (!isMounted) {
    return null;
  }

  const navStyle: CSSProperties = {
    ...styles.nav,
    transform: isVisible ? "translateX(0)" : "translateX(calc(-100% - 18px))",
    opacity: isVisible ? 1 : 0,
    boxShadow: isVisible ? "0 22px 48px rgba(15, 23, 42, 0.14)" : styles.nav.boxShadow,
  };

  const overlayStyle: CSSProperties = {
    ...styles.overlay,
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? "auto" : "none",
  };

  return (
    <>
      <Box
        data-testid="sidebar-overlay"
        style={overlayStyle}
        onClick={onClose}
        role="presentation"
      />
      <Box asChild>
        <nav style={navStyle} aria-hidden={!isVisible} aria-label="サイドバーナビゲーション">
          <Flex style={styles.panel}>
            <Flex style={styles.menuSection}>
              <Text as="span" style={styles.sectionLabel}>
                Screens
              </Text>
              <Button
                type="button"
                size="3"
                radius="large"
                variant="surface"
                color="gray"
                style={{
                  ...styles.homeItem,
                  textAlign: "left" as const,
                }}
                onClick={() => {
                  onClose();
                  onNavigate?.("/");
                }}
              >
                <Flex as="span" style={styles.homeItemLabel}>
                  <FaHouse aria-hidden="true" style={styles.navIcon} />
                  <Text as="span">Groups</Text>
                </Flex>
                <Box as="span" aria-hidden="true" style={styles.chevron}>
                  <FaChevronRight />
                </Box>
              </Button>
              <Button
                type="button"
                size="3"
                radius="large"
                variant="surface"
                color="gray"
                style={{
                  ...styles.homeItem,
                  textAlign: "left" as const,
                }}
                onClick={() => {
                  onClose();
                  onNavigate?.("/users");
                }}
              >
                <Flex as="span" style={styles.homeItemLabel}>
                  <FaUsers aria-hidden="true" style={styles.navIcon} />
                  <Text as="span">Users</Text>
                </Flex>
                <Box as="span" aria-hidden="true" style={styles.chevron}>
                  <FaChevronRight />
                </Box>
              </Button>
            </Flex>
          </Flex>
        </nav>
      </Box>
    </>
  );
}
