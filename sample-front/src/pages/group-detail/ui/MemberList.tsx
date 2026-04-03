import { Box, Button, Flex, Skeleton, Text, TextField } from "@radix-ui/themes";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlass } from "react-icons/fa6";

import type { Member } from "@/pages/group-detail/model/group-detail";
import { useMemberList } from "@/pages/group-detail/model/useMemberList";
import { styles } from "./MemberList.styles";

const PER_PAGE_OPTIONS = [20, 50, 100] as const;
const SKELETON_ROWS = 5;

function MemberAvatar({ member }: { member: Member }) {
  const initials = `${member.last_name.charAt(0)}${member.first_name.charAt(0)}`.toUpperCase();

  return (
    <Flex style={styles.avatar}>
      <Text as="span">{initials}</Text>
    </Flex>
  );
}

function MemberRow({ member, isLast }: { member: Member; isLast: boolean }) {
  return (
    <Flex style={{ ...styles.memberRow, ...(isLast ? {} : styles.memberRowBorder) }}>
      <MemberAvatar member={member} />
      <Text as="p" style={styles.memberName}>
        {member.last_name} {member.first_name}
      </Text>
    </Flex>
  );
}

function SkeletonMemberRow({ isLast }: { isLast: boolean }) {
  return (
    <Flex style={{ ...styles.skeletonRow, ...(isLast ? {} : styles.memberRowBorder) }}>
      <Box style={styles.skeletonAvatar} />
      <Skeleton style={styles.skeletonLine} />
    </Flex>
  );
}

type MemberListProps = {
  groupId: number;
};

export function MemberList({ groupId }: MemberListProps) {
  const {
    members,
    total,
    currentPage,
    totalPages,
    perPage,
    searchQuery,
    error,
    isLoading,
    setCurrentPage,
    setPerPage,
    setSearchQuery,
  } = useMemberList(groupId);

  const isInitialLoading = isLoading && members.length === 0;

  return (
    <Box>
      <Box style={styles.searchSection}>
        <TextField.Root
          size="3"
          radius="large"
          variant="surface"
          style={styles.searchField}
          placeholder="Search members"
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

      {error && (
        <Text as="p" style={styles.errorText}>
          {error}
        </Text>
      )}

      {isInitialLoading && (
        <Box style={styles.listCard}>
          <Text as="p" className="visually-hidden">
            loading members...
          </Text>
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <SkeletonMemberRow key={i} isLast={i === SKELETON_ROWS - 1} />
          ))}
        </Box>
      )}

      {!isInitialLoading && !error && members.length === 0 && (
        <Text as="p" style={styles.emptyText}>
          No members found.
        </Text>
      )}

      {!isInitialLoading && members.length > 0 && (
        <Box style={styles.listCard}>
          {members.map((member, index) => (
            <MemberRow key={member.id} member={member} isLast={index === members.length - 1} />
          ))}
        </Box>
      )}

      {!isInitialLoading && total > 0 && (
        <Flex style={styles.paginationSection}>
          <Text as="p" style={styles.paginationMeta}>
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
