import { Box, Skeleton, Text } from "@radix-ui/themes";

import type { Member } from "@/pages/group-detail/model/group-detail";
import { useGroupDetail } from "@/pages/group-detail/model/useGroupDetail";
import { styles } from "./GroupDetailPage.styles";
import { MemberList } from "./MemberList";

type GroupDetailContentProps = {
  groupId: number;
  onMemberClick?: (member: Member) => void;
};

function GroupInfoSkeleton() {
  return (
    <Box style={styles.sectionCard}>
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
  const { group, error, isLoading } = useGroupDetail(groupId);

  return (
    <>
      {isLoading && <GroupInfoSkeleton />}

      {error && (
        <Text as="p" style={styles.errorText}>
          {error}
        </Text>
      )}

      {!isLoading && !error && group && (
        <>
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

          <Box style={styles.sectionHeader}>
            <Text as="p" style={styles.sectionTitle}>
              Members
            </Text>
            <Text as="p" style={styles.sectionMeta}>
              {group.member_count} total
            </Text>
          </Box>

          <MemberList groupId={groupId} onMemberClick={onMemberClick} />
        </>
      )}
    </>
  );
}
