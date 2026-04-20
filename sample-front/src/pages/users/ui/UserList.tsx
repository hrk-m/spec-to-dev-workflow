import { Box, Flex, Heading, Skeleton, Spinner, Text, TextField } from "@radix-ui/themes";
import { FaMagnifyingGlass } from "react-icons/fa6";

import type { User } from "@/pages/users/model/user";
import { useUserList } from "@/pages/users/model/user-list";
import { styles } from "./UserList.styles";

const SKELETON_ROWS = 3;

function UserTableRow({ user, isLast }: { user: User; isLast: boolean }) {
  return (
    <tr style={isLast ? styles.tableRowLast : styles.tableRow}>
      <td style={styles.tableCellId}>{user.id}</td>
      <td style={styles.tableCellUuid}>{user.uuid}</td>
      <td style={styles.tableCellName}>
        {user.last_name} {user.first_name}
      </td>
    </tr>
  );
}

function SkeletonUserRow() {
  return (
    <tr style={styles.tableRow}>
      <td style={styles.skeletonCell}>
        <Skeleton style={{ ...styles.skeletonLine, width: "40px" }} />
      </td>
      <td style={styles.skeletonCell}>
        <Skeleton style={{ ...styles.skeletonLine, width: "260px" }} />
      </td>
      <td style={styles.skeletonCell}>
        <Skeleton style={{ ...styles.skeletonLine, width: "120px" }} />
      </td>
    </tr>
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
          <table style={styles.tableRoot}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableHeaderCell}>id</th>
                <th style={styles.tableHeaderCell}>uuid</th>
                <th style={styles.tableHeaderCell}>姓名</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <SkeletonUserRow key={i} />
              ))}
            </tbody>
          </table>
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
            <table style={styles.tableRoot}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>id</th>
                  <th style={styles.tableHeaderCell}>uuid</th>
                  <th style={styles.tableHeaderCell}>姓名</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <UserTableRow key={user.id} user={user} isLast={index === users.length - 1} />
                ))}
              </tbody>
            </table>
          </section>
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
