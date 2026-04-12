import { Box, Button, Flex, Heading, Skeleton, Text, TextField } from "@radix-ui/themes";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlass } from "react-icons/fa6";

import type { User } from "@/pages/users/model/user";
import { PER_PAGE_OPTIONS, useUserList } from "@/pages/users/model/user-list";
import { styles } from "./UserList.styles";

const SKELETON_ROWS = 5;

function UserAvatar({ user }: { user: User }) {
  const initials = `${user.last_name.charAt(0)}${user.first_name.charAt(0)}`.toUpperCase();

  return (
    <Flex style={styles.avatar}>
      <Text as="span">{initials}</Text>
    </Flex>
  );
}

function UserRow({ user, isLast }: { user: User; isLast: boolean }) {
  return (
    <Box style={{ ...styles.rowBlock, ...(isLast ? {} : styles.rowBorder) }}>
      <Flex style={styles.rowShell}>
        <Flex style={styles.rowContent}>
          <UserAvatar user={user} />
          <Box style={styles.rowNameStack}>
            <Text as="p" style={styles.rowName}>
              {user.last_name} {user.first_name}
            </Text>
            <Text as="p" style={styles.rowSubtext}>
              User profile
            </Text>
          </Box>
        </Flex>
        <Flex style={styles.rowMeta}>
          <Text as="span" style={styles.rowMetaLabel}>
            ID
          </Text>
          <Text as="span" style={styles.rowMetaValue}>
            #{user.id}
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}

function SkeletonUserRow({ isLast }: { isLast: boolean }) {
  return (
    <Flex style={{ ...styles.skeletonRow, ...(isLast ? {} : styles.rowBorder) }}>
      <Box style={styles.skeletonAvatar} />
      <Flex style={styles.skeletonNameStack}>
        <Skeleton style={{ ...styles.skeletonLine, width: "52%" }} />
        <Skeleton style={{ ...styles.skeletonLine, width: "38%" }} />
      </Flex>
    </Flex>
  );
}

export function UserList() {
  const {
    users,
    currentPage,
    totalPages,
    perPage,
    searchQuery,
    error,
    isLoading,
    setCurrentPage,
    setPerPage,
    setSearchQuery,
    userCountLabel,
    visibleUserCountLabel,
  } = useUserList();

  const isInitialLoading = isLoading && users.length === 0;

  return (
    <Box>
      <Flex style={styles.heroSection} justify="between" align="start">
        <Box>
          <Heading as="h1" style={styles.pageTitle}>
            Users
          </Heading>
          <Text as="p" style={styles.pageSubtitle}>
            {userCountLabel}
          </Text>
        </Box>
      </Flex>

      <Box style={styles.searchSection}>
        <TextField.Root
          size="3"
          radius="large"
          variant="surface"
          style={styles.searchField}
          placeholder="Search by name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        >
          <TextField.Slot>
            <FaMagnifyingGlass aria-hidden="true" style={styles.searchFieldIcon} />
          </TextField.Slot>
        </TextField.Root>
      </Box>

      <Flex style={styles.perPageSection}>
        {PER_PAGE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            style={{
              ...styles.perPageButton,
              ...(perPage === option ? styles.perPageButtonActive : styles.perPageButtonInactive),
            }}
            onClick={() => setPerPage(option)}
          >
            {option}
          </button>
        ))}
      </Flex>

      {error && users.length === 0 && (
        <Box style={styles.errorCard}>
          <Text as="p" style={styles.errorTitle}>
            Couldn&apos;t load users
          </Text>
          <Text as="p" style={styles.errorText}>
            {error}
          </Text>
        </Box>
      )}

      {isInitialLoading && (
        <Box style={styles.listSection}>
          <Text as="p" className="visually-hidden">
            loading...
          </Text>
          <Box style={styles.listCard}>
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <SkeletonUserRow key={i} isLast={i === SKELETON_ROWS - 1} />
            ))}
          </Box>
        </Box>
      )}

      {!isInitialLoading && users.length > 0 && (
        <Box asChild>
          <section style={styles.listSection}>
            <Box style={styles.sectionHeader}>
              <Text as="p" style={styles.sectionTitle}>
                All Users
              </Text>
              <Text as="p" style={styles.sectionMeta}>
                {visibleUserCountLabel}
              </Text>
            </Box>
            <Box style={styles.listCard}>
              {users.map((user, index) => (
                <UserRow key={user.id} user={user} isLast={index === users.length - 1} />
              ))}
            </Box>
          </section>
        </Box>
      )}

      {!isInitialLoading && !error && users.length === 0 && (
        <Box style={styles.emptyState}>
          <Text as="p" style={styles.emptyStateTitle}>
            No users matched that search.
          </Text>
          <Text as="p" style={styles.emptyStateText}>
            Try a shorter phrase or search by part of a user name.
          </Text>
        </Box>
      )}

      {error && users.length > 0 && (
        <Box style={styles.inlineErrorCard}>
          <Text as="p" style={styles.errorText}>
            {error}
          </Text>
        </Box>
      )}

      {!isInitialLoading && users.length > 0 && (
        <Flex style={styles.footerSection}>
          <Text as="p" style={styles.footerMeta}>
            Page {currentPage} of {totalPages}
          </Text>
          <Flex style={styles.paginationButtons}>
            <Button
              type="button"
              size="2"
              radius="full"
              variant="soft"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <FaChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <Button
              type="button"
              size="2"
              radius="full"
              variant="soft"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
              <FaChevronRight aria-hidden="true" />
            </Button>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}
