import { useCallback, useEffect, useState } from "react";
import { Box, Button, Checkbox, Flex, Skeleton, Spinner, Text, TextField } from "@radix-ui/themes";
import { FaMagnifyingGlass } from "react-icons/fa6";

import { addGroupMembers } from "@/pages/group-detail/api/add-group-members";
import { useGroupDetail } from "@/pages/group-detail/model/group-detail-state";
import { clearMemberListCache } from "@/pages/group-detail/model/member-list";
import {
  clearNonMemberListCache,
  useNonMemberList,
} from "@/pages/group-detail/model/useNonMemberList";
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

  useEffect(() => {
    clearNonMemberListCache(groupId);
  }, [groupId]);

  const {
    users,
    isLoading,
    isFetchingMore,
    fetchMoreError,
    error: fetchError,
    searchQuery,
    setSearchQuery,
    sentinelRef,
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

      {/* Inline error for additional fetch failures */}
      {fetchMoreError && (
        <Text as="p" style={styles.errorText}>
          {fetchMoreError}
        </Text>
      )}

      {/* Spinner for additional fetch */}
      {isFetchingMore && (
        <Flex justify="center" style={{ marginTop: 12 }}>
          <Spinner aria-label="Loading more non-members" />
        </Flex>
      )}

      {/* Sentinel element for IntersectionObserver */}
      <div
        ref={sentinelRef}
        style={{ height: 1 }}
        aria-hidden="true"
        data-testid="non-member-sentinel"
      />

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
