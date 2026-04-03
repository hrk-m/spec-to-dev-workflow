import { Box, Flex, IconButton, Text } from "@radix-ui/themes";
import { FaBars } from "react-icons/fa6";

import { styles } from "./Header.styles";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <Box asChild>
      <header style={styles.header}>
        <Flex style={styles.inner}>
          <Flex style={styles.leading}>
            <IconButton
              size="2"
              variant="ghost"
              radius="full"
              style={styles.menuButton}
              aria-label="Open navigation"
              onClick={onMenuClick}
            >
              <FaBars aria-hidden="true" style={styles.menuIcon} />
            </IconButton>
          </Flex>
          <Text as="span" style={styles.title}>
            Sample Front
          </Text>
          <Flex style={styles.trailing}>
            <Box style={styles.accountAvatar} role="img" aria-label="Account">
              <Text as="span" style={styles.accountInitials}>
                HR
              </Text>
            </Box>
          </Flex>
        </Flex>
      </header>
    </Box>
  );
}
