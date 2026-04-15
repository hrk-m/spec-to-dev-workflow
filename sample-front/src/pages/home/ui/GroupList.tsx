import { Box, Callout, Flex, Heading, Skeleton, Spinner, Text, TextField } from "@radix-ui/themes";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { useNavigate } from "react-router";

import type { Group } from "@/pages/home/model/group";
import { useGroupList } from "@/pages/home/model/group-list";
import { PageContainer } from "@/shared/ui";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { styles } from "./GroupList.styles";

const SKELETON_ROWS = 5;

function SkeletonRow({ isWideLayout, isLast }: { isWideLayout: boolean; isLast: boolean }) {
  return (
    <Box style={{ ...styles.rowBlock, ...(isLast ? {} : styles.rowBorder) }}>
      <Flex
        style={{
          ...styles.rowShell,
          flexDirection: isWideLayout ? "row" : "column",
          alignItems: isWideLayout ? "center" : "flex-start",
        }}
      >
        <Flex style={styles.skeletonStack}>
          <Skeleton style={{ ...styles.skeletonLine, width: 84, height: 18 }} />
          <Skeleton style={{ ...styles.skeletonLine, width: "72%", height: 14 }} />
        </Flex>
        <Flex style={styles.skeletonMeta}>
          <Skeleton style={{ ...styles.skeletonLine, width: 68, height: 14 }} />
          <Skeleton style={{ ...styles.skeletonLine, width: 42, height: 26, borderRadius: 999 }} />
        </Flex>
      </Flex>
    </Box>
  );
}

function GroupRow({
  group,
  isLast,
  isWideLayout,
  onClick,
}: {
  group: Group;
  isLast: boolean;
  isWideLayout: boolean;
  onClick: () => void;
}) {
  const memberCount = group.member_count;
  const rowShellStyle = {
    ...styles.rowShell,
    flexDirection: isWideLayout ? ("row" as const) : ("column" as const),
    alignItems: isWideLayout ? ("center" as const) : ("flex-start" as const),
  };
  const rowMetaStyle = {
    ...styles.rowMeta,
    alignItems: isWideLayout ? ("flex-end" as const) : ("flex-start" as const),
  };

  return (
    <Box
      style={{ ...styles.rowBlock, ...(isLast ? {} : styles.rowBorder), cursor: "pointer" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Flex style={rowShellStyle}>
        <Flex style={styles.rowContent}>
          <Heading as="h2" style={styles.rowTitle}>
            {group.name}
          </Heading>
          <Text as="p" style={styles.rowDescription}>
            {group.description}
          </Text>
        </Flex>
        <Flex style={rowMetaStyle}>
          <Text as="span" style={styles.rowMetaLabel}>
            Members
          </Text>
          <Text as="span" style={styles.rowMetaValue}>
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}

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
    isWideLayout,
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
          <Box style={styles.listCard}>
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <SkeletonRow key={i} isWideLayout={isWideLayout} isLast={i === SKELETON_ROWS - 1} />
            ))}
          </Box>
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
            <Box style={styles.listCard}>
              {groups.map((group, index) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  isLast={index === groups.length - 1}
                  isWideLayout={isWideLayout}
                  onClick={() => {
                    if (onGroupClick) {
                      onGroupClick(group.id);
                    } else {
                      navigate(`/groups/${String(group.id)}`);
                    }
                  }}
                />
              ))}
            </Box>
          </section>
        </Box>
      )}

      {!isInitialLoading && !error && groups.length === 0 && (
        <Box style={styles.emptyState}>
          <Text as="p" style={styles.emptyStateTitle}>
            No groups matched that search.
          </Text>
          <Text as="p" style={styles.emptyStateText}>
            Try a shorter phrase or search by part of a group name.
          </Text>
        </Box>
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
