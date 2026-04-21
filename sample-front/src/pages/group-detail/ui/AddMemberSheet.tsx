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
import { styles } from "./AddMemberSheet.styles";

const SKELETON_ROWS = 5;

const containerStyle = {
  padding: "0 24px 24px",
} as const;

const footerStyle = {
  marginTop: 20,
  display: "flex",
  justifyContent: "flex-end",
} as const;

const loadingTextStyle = {
  margin: 0,
  fontSize: 14,
  color: "#8e8e93",
  textAlign: "center" as const,
  padding: "28px 24px",
} as const;

type AddMemberSheetProps = {
  groupId: number;
  onClose: () => void;
};

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
    <Box style={containerStyle}>
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

      <Box style={footerStyle}>
        <Button
          variant="soft"
          size="2"
          radius="full"
          disabled={selectedIds.size === 0 || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          一括追加
        </Button>
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
          <Text as="p" className="visually-hidden" style={loadingTextStyle}>
            loading non-members...
          </Text>
          <table style={styles.tableRoot}>
            <thead style={styles.tableHeader}>
              <tr>
                <th aria-label="選択" style={styles.tableHeaderCellCheckbox} />
                <th style={styles.tableHeaderCell}>姓名</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <tr key={i} style={i < SKELETON_ROWS - 1 ? styles.skeletonRow : undefined}>
                  <td style={styles.skeletonCell}>
                    <Flex align="center">
                      <Skeleton style={{ width: 16, height: 16, borderRadius: 4 }} />
                    </Flex>
                  </td>
                  <td style={styles.skeletonCell}>
                    <Skeleton style={styles.skeletonLine} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {!isLoading && !fetchError && users.length === 0 && (
        <Text as="p" style={styles.emptyText}>
          追加できるユーザーがいません。
        </Text>
      )}

      {users.length > 0 && (
        <table style={styles.tableRoot}>
          <thead style={styles.tableHeader}>
            <tr>
              <th aria-label="選択" style={styles.tableHeaderCellCheckbox} />
              <th style={styles.tableHeaderCell}>姓名</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr
                key={user.id}
                style={index < users.length - 1 ? styles.tableRow : styles.tableRowLast}
                onClick={() => handleToggle(user.id)}
              >
                <td style={styles.tableCellCheckbox}>
                  <Flex align="center">
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => handleToggle(user.id)}
                    />
                  </Flex>
                </td>
                <td style={styles.tableCellName}>
                  {user.last_name} {user.first_name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </Box>
  );
}
