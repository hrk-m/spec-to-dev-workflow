import { Box, Button, Callout, Flex, Heading, Skeleton, Text, TextField } from "@radix-ui/themes";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlass } from "react-icons/fa6";
import { useNavigate } from "react-router";

import type { Group } from "@/pages/home/model/group";
import { PER_PAGE_OPTIONS, useGroupList } from "@/pages/home/model/useGroupList";
import { PageContainer } from "@/shared/ui";
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

export function GroupList() {
  const navigate = useNavigate();
  const {
    groups,
    total,
    currentPage,
    totalPages,
    perPage,
    searchQuery,
    error,
    isLoading,
    isWideLayout,
    setCurrentPage,
    setPerPage,
    setSearchQuery,
    groupCountLabel,
    visibleGroupCountLabel,
  } = useGroupList();

  const isInitialLoading = isLoading && groups.length === 0;

  return (
    <PageContainer>
      <Box style={styles.heroSection}>
        <Heading as="h1" style={styles.pageTitle}>
          Groups
        </Heading>
        <Text as="p" style={styles.pageSubtitle}>
          {groupCountLabel}
        </Text>
      </Box>

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
              <Text as="p" style={styles.sectionMeta}>
                {visibleGroupCountLabel}
              </Text>
            </Box>
            <Box style={styles.listCard}>
              {groups.map((group, index) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  isLast={index === groups.length - 1}
                  isWideLayout={isWideLayout}
                  onClick={() => navigate(`/groups/${String(group.id)}`)}
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

      {error && groups.length > 0 && (
        <Callout.Root color="red" style={styles.inlineErrorCard}>
          <Callout.Text style={styles.errorText}>{error}</Callout.Text>
        </Callout.Root>
      )}

      {!isInitialLoading && total > 0 && (
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
    </PageContainer>
  );
}
