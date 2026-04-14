import { useCallback, useState } from "react";
import { Box, Button, Flex, Heading, Skeleton, Text } from "@radix-ui/themes";
import { useNavigate } from "react-router";

import type { UserSummary } from "@/pages/group-detail/model/group-detail";
import { useGroupDetail } from "@/pages/group-detail/model/group-detail-state";
import { useSheetStack } from "@/shared/lib/sheet-stack";
import { AddMemberSheet } from "./AddMemberSheet";
import { DeleteGroupDialog } from "./DeleteGroupDialog";
import { EditGroupDialog } from "./EditGroupDialog";
import { styles } from "./GroupDetailPage.styles";
import { MemberList } from "./MemberList";

type GroupDetailContentProps = {
  groupId: number;
  onMemberClick?: (member: UserSummary) => void;
};

function GroupInfoSkeleton() {
  return (
    <Box style={styles.sectionCard}>
      <Text as="p" className="visually-hidden">
        loading group...
      </Text>
      <Box style={{ ...styles.skeletonBlock, ...styles.infoRowBorder }}>
        <Skeleton style={{ ...styles.skeletonLine, width: 60, height: 12 }} />
        <Skeleton style={{ ...styles.skeletonLine, width: 120, height: 16, marginTop: 4 }} />
      </Box>
      <Box style={styles.skeletonBlock}>
        <Skeleton style={{ ...styles.skeletonLine, width: 80, height: 12 }} />
        <Skeleton style={{ ...styles.skeletonLine, width: "80%", height: 16, marginTop: 4 }} />
      </Box>
    </Box>
  );
}

export function GroupDetailContent({ groupId, onMemberClick }: GroupDetailContentProps) {
  const { group, error, isLoading, refetch } = useGroupDetail(groupId);
  const navigate = useNavigate();
  const { openSheet, closeSheet } = useSheetStack();
  const shouldShowSkeleton = isLoading && !group;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleOpenAddMemberSheet = useCallback(() => {
    openSheet({
      id: `add-member-${groupId}`,
      content: (
        <AddMemberSheet
          groupId={groupId}
          onClose={() => {
            closeSheet();
            refetch();
          }}
        />
      ),
    });
  }, [groupId, openSheet, closeSheet, refetch]);

  return (
    <>
      {shouldShowSkeleton && <GroupInfoSkeleton />}

      {error && !group && (
        <Text as="p" style={styles.errorText}>
          {error}
        </Text>
      )}

      {group && (
        <>
          {error && (
            <Text as="p" style={styles.errorText}>
              {error}
            </Text>
          )}

          <Flex justify="between" align="center" mb="3">
            <Heading as="h1" style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.7 }}>
              Group
            </Heading>
            <Flex gap="2">
              <Button variant="soft" onClick={() => setEditDialogOpen(true)}>
                Edit
              </Button>
              <Button variant="soft" color="red" onClick={() => setDeleteDialogOpen(true)}>
                Delete
              </Button>
            </Flex>
          </Flex>

          <Box style={styles.sectionCard}>
            <Box style={{ ...styles.infoRow, ...styles.infoRowBorder }}>
              <Text as="p" style={styles.infoLabel}>
                Name
              </Text>
              <Text as="p" style={styles.infoValue}>
                {group.name}
              </Text>
            </Box>
            <Box style={styles.infoRow}>
              <Text as="p" style={styles.infoLabel}>
                Description
              </Text>
              <Text as="p" style={styles.infoValue}>
                {group.description}
              </Text>
            </Box>
          </Box>

          <EditGroupDialog
            groupId={groupId}
            initialName={group.name}
            initialDescription={group.description}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={refetch}
          />

          <DeleteGroupDialog
            groupId={groupId}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={() => void navigate("/")}
          />

          <Box style={styles.sectionHeader}>
            <Text as="p" style={styles.sectionTitle}>
              Members
            </Text>
            <Flex align="center" gap="3">
              <Text as="p" style={styles.sectionMeta}>
                {group.member_count} total
              </Text>
              <Button variant="soft" size="1" onClick={handleOpenAddMemberSheet}>
                メンバー追加
              </Button>
            </Flex>
          </Box>

          <MemberList groupId={groupId} onMemberClick={onMemberClick} onRefetch={refetch} />
        </>
      )}
    </>
  );
}
