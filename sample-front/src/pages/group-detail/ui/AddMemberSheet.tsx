import { useCallback, useState } from "react";
import { Box, Button, Checkbox, Flex, Skeleton, Text, TextField } from "@radix-ui/themes";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlass } from "react-icons/fa6";

import { addGroupMembers } from "@/pages/group-detail/api/add-group-members";
import { useGroupDetail } from "@/pages/group-detail/model/group-detail-state";
import { clearMemberListCache } from "@/pages/group-detail/model/member-list";
import { PER_PAGE_OPTIONS, useNonMemberList } from "@/pages/group-detail/model/useNonMemberList";
import { appColors } from "@/shared/ui";

const SKELETON_ROWS = 5;

const styles = {
  container: {
    padding: "0 24px 24px",
  },
  searchSection: {
    marginTop: 18,
  },
  searchField: {
    width: "100%",
    boxSizing: "border-box" as const,
    background: appColors.searchBackground,
    borderRadius: 16,
    boxShadow: `inset 0 0 0 1px ${appColors.separator}`,
  },
  searchFieldIcon: {
    width: 18,
    height: 18,
    display: "block",
    color: appColors.textSecondary,
  },
  perPageSection: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 16,
  },
  perPageButton: {
    minWidth: 48,
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 999,
    cursor: "pointer",
    padding: "5px 12px",
    border: "none",
    transition: "background 0.15s ease",
  },
  perPageButtonActive: {
    background: appColors.accent,
    color: "#FFFFFF",
  },
  perPageButtonInactive: {
    background: appColors.searchBackground,
    color: appColors.textSecondary,
  },
  listCard: {
    marginTop: 16,
    background: appColors.surfaceRaised,
    border: `1px solid ${appColors.separator}`,
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.06)",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
    cursor: "pointer",
  },
  userRowBorder: {
    borderBottom: `1px solid ${appColors.separator}`,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%" as const,
    background: appColors.accentSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 14,
    fontWeight: 600,
    color: appColors.accent,
  },
  userName: {
    margin: 0,
    fontSize: 15,
    fontWeight: 500,
    color: appColors.textPrimary,
    flex: 1,
  },
  errorText: {
    margin: "12px 0 0",
    fontSize: 14,
    lineHeight: 1.5,
    color: appColors.error,
    padding: "12px 16px",
    background: appColors.errorBackground,
    borderRadius: 12,
    border: `1px solid ${appColors.errorBorder}`,
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: appColors.textSecondary,
    textAlign: "center" as const,
    padding: "28px 24px",
  },
  paginationSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap" as const,
    marginTop: 16,
  },
  paginationMeta: {
    margin: 0,
    fontSize: 13,
    color: appColors.textSecondary,
  },
  paginationButtons: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  footer: {
    marginTop: 20,
  },
  bulkButton: {
    width: "100%",
  },
  skeletonRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%" as const,
    background: "rgba(118, 118, 128, 0.16)",
    flexShrink: 0,
  },
  skeletonLine: {
    background: "rgba(118, 118, 128, 0.16)",
    borderRadius: 999,
    height: 14,
    width: "60%",
  },
  loadingText: {
    margin: 0,
    fontSize: 14,
    color: appColors.textSecondary,
    textAlign: "center" as const,
    padding: "28px 24px",
  },
} as const;

type AddMemberSheetProps = {
  groupId: number;
  onClose: () => void;
};

function UserAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();
  return (
    <Flex style={styles.avatar}>
      <Text as="span">{initials}</Text>
    </Flex>
  );
}

export function AddMemberSheet({ groupId, onClose }: AddMemberSheetProps) {
  const { refetch } = useGroupDetail(groupId);
  const {
    users,
    isLoading,
    error: fetchError,
    searchQuery,
    setSearchQuery,
    currentPage,
    totalPages,
    perPage,
    setCurrentPage,
    setPerPage,
  } = useNonMemberList(groupId);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = useCallback((userId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addGroupMembers({ groupId, userIds: Array.from(selectedIds) });
      clearMemberListCache();
      refetch();
      onClose();
    } catch (err: unknown) {
      const message = String(err);
      if (message.includes("409")) {
        setSubmitError("選択したユーザーはすでにメンバーです");
      } else {
        setSubmitError("エラーが発生しました。しばらくしてから再試行してください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [groupId, selectedIds, refetch, onClose]);

  return (
    <Box style={styles.container}>
      <Box style={styles.searchSection}>
        <TextField.Root
          size="3"
          radius="large"
          variant="surface"
          style={styles.searchField}
          placeholder="Search non-members"
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

      {fetchError && (
        <Text as="p" style={styles.errorText}>
          {fetchError}
        </Text>
      )}

      {submitError && (
        <Text as="p" style={styles.errorText}>
          {submitError}
        </Text>
      )}

      {isLoading && users.length === 0 && (
        <>
          <Text as="p" className="visually-hidden" style={styles.loadingText}>
            loading non-members...
          </Text>
          <Box style={styles.listCard}>
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <Flex
                key={i}
                style={{
                  ...styles.skeletonRow,
                  ...(i < SKELETON_ROWS - 1 ? styles.userRowBorder : {}),
                }}
              >
                <Box style={styles.skeletonAvatar} />
                <Skeleton style={styles.skeletonLine} />
              </Flex>
            ))}
          </Box>
        </>
      )}

      {!isLoading && !fetchError && users.length === 0 && (
        <Text as="p" style={styles.emptyText}>
          追加できるユーザーがいません。
        </Text>
      )}

      {users.length > 0 && (
        <Box style={styles.listCard}>
          {users.map((user, index) => (
            <Flex
              key={user.id}
              style={{
                ...styles.userRow,
                ...(index < users.length - 1 ? styles.userRowBorder : {}),
              }}
              onClick={() => handleToggle(user.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToggle(user.id);
                }
              }}
            >
              <Checkbox
                checked={selectedIds.has(user.id)}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => handleToggle(user.id)}
              />
              <UserAvatar firstName={user.first_name} lastName={user.last_name} />
              <Text as="p" style={styles.userName}>
                {user.last_name} {user.first_name}
              </Text>
            </Flex>
          ))}
        </Box>
      )}

      {users.length > 0 && (
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

      <Box style={styles.footer}>
        <Button
          size="3"
          radius="large"
          style={styles.bulkButton}
          disabled={selectedIds.size === 0 || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          一括追加
        </Button>
      </Box>
    </Box>
  );
}
