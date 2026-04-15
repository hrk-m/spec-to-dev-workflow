import { Box, Flex, Heading, Skeleton, Spinner, Text, TextField } from "@radix-ui/themes";
import { FaMagnifyingGlass } from "react-icons/fa6";

import type { User } from "@/pages/users/model/user";
import { useUserList } from "@/pages/users/model/user-list";
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
    searchQuery,
    error,
    isLoading,
    isFetchingMore,
    fetchMoreError,
    sentinelRef,
    setSearchQuery,
    userCountLabel,
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
            No users found
          </Text>
          <Text as="p" style={styles.emptyStateText}>
            Try a shorter phrase or search by part of a user name.
          </Text>
        </Box>
      )}

      {fetchMoreError && (
        <Box style={styles.inlineErrorCard}>
          <Text as="p" style={styles.errorText}>
            {fetchMoreError}
          </Text>
        </Box>
      )}

      {isFetchingMore && (
        <Flex justify="center" style={{ marginTop: 16 }}>
          <Spinner aria-label="Loading more users" />
        </Flex>
      )}

      {/* Sentinel element for IntersectionObserver */}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" data-testid="sentinel" />
    </Box>
  );
}
