import { Box, Callout, Flex, Heading, Skeleton, Spinner, Text, TextField } from "@radix-ui/themes";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { useNavigate } from "react-router";

import { useGroupList } from "@/pages/home/model/group-list";
import { PageContainer } from "@/shared/ui";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { styles } from "./GroupList.styles";

const SKELETON_ROWS = 5;

type GroupListProps = {
  onGroupClick?: (groupId: number) => void;
};

export function GroupList({ onGroupClick }: GroupListProps) {
  const navigate = useNavigate();
  const {
    groups,
    searchQuery,
    error,
    isLoading,
    isFetchingMore,
    fetchMoreError,
    sentinelRef,
    setSearchQuery,
    groupCountLabel,
  } = useGroupList();

  const isInitialLoading = isLoading && groups.length === 0;

  return (
    <PageContainer>
      <Flex style={styles.heroSection} justify="between" align="start">
        <Box>
          <Heading as="h1" style={styles.pageTitle}>
            Groups
          </Heading>
          <Text as="p" style={styles.pageSubtitle}>
            {groupCountLabel}
          </Text>
        </Box>
        <CreateGroupDialog />
      </Flex>

      <Box style={styles.searchSection}>
        <TextField.Root
          size="3"
          radius="large"
          variant="surface"
          style={styles.searchField}
          placeholder="Search by name or description"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        >
          <TextField.Slot>
            <FaMagnifyingGlass aria-hidden="true" style={styles.searchFieldIcon} />
          </TextField.Slot>
        </TextField.Root>
      </Box>

      {error && groups.length === 0 && (
        <Callout.Root color="red" style={styles.errorCard}>
          <Flex direction="column" gap="1">
            <Text as="p" style={styles.errorTitle}>
              Couldn&apos;t load groups
            </Text>
            <Callout.Text style={styles.errorText}>{error}</Callout.Text>
          </Flex>
        </Callout.Root>
      )}

      {isInitialLoading && (
        <Box style={styles.listSection}>
          <Text as="p" className="visually-hidden">
            loading...
          </Text>
          <table style={styles.tableRoot}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableHeaderCellId}>ID</th>
                <th style={styles.tableHeaderCell}>グループ名</th>
                <th style={styles.tableHeaderCell}>説明</th>
                <th style={styles.tableHeaderCell}>メンバー数</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <tr key={i} style={styles.skeletonRow}>
                  <td style={styles.skeletonCell}>
                    <Skeleton style={{ ...styles.skeletonLine, width: 32 }} />
                  </td>
                  <td style={styles.skeletonCell}>
                    <Skeleton style={{ ...styles.skeletonLine, width: 120 }} />
                  </td>
                  <td style={styles.skeletonCell}>
                    <Skeleton style={{ ...styles.skeletonLine, width: "60%" }} />
                  </td>
                  <td style={styles.skeletonCell}>
                    <Skeleton style={{ ...styles.skeletonLine, width: 40 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      {!isInitialLoading && groups.length > 0 && (
        <Box asChild>
          <section style={styles.listSection}>
            <Box style={styles.sectionHeader}>
              <Text as="p" style={styles.sectionTitle}>
                All Groups
              </Text>
            </Box>
            <table style={styles.tableRoot}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCellId}>ID</th>
                  <th style={styles.tableHeaderCell}>グループ名</th>
                  <th style={styles.tableHeaderCell}>説明</th>
                  <th style={styles.tableHeaderCell}>メンバー数</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, index) => (
                  <tr
                    key={group.id}
                    style={{
                      ...(index < groups.length - 1 ? styles.tableRow : styles.tableRowLast),
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (onGroupClick) {
                        onGroupClick(group.id);
                      } else {
                        navigate(`/groups/${String(group.id)}`);
                      }
                    }}
                  >
                    <td style={styles.tableCellId}>{group.id}</td>
                    <td style={styles.tableCellName}>{group.name}</td>
                    <td style={styles.tableCellDescription}>{group.description}</td>
                    <td style={styles.tableCellCount}>{group.member_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </Box>
      )}

      {!isInitialLoading && !error && groups.length === 0 && (
        <Text as="p" style={styles.emptyText}>
          No groups matched that search.
        </Text>
      )}

      {/* Inline error for additional fetch failures */}
      {fetchMoreError && (
        <Callout.Root color="red" style={styles.inlineErrorCard}>
          <Callout.Text style={styles.errorText}>{fetchMoreError}</Callout.Text>
        </Callout.Root>
      )}

      {/* Spinner for additional fetch */}
      {isFetchingMore && (
        <Flex justify="center" style={{ marginTop: 16 }}>
          <Spinner aria-label="Loading more groups" />
        </Flex>
      )}

      {/* Sentinel element for IntersectionObserver */}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" data-testid="sentinel" />
    </PageContainer>
  );
}
