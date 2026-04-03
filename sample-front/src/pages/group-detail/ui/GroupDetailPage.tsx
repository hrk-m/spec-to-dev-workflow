import { Box, Skeleton, Text } from "@radix-ui/themes";
import { FaChevronLeft } from "react-icons/fa6";
import { useNavigate, useParams } from "react-router";

import { useGroupDetail } from "@/pages/group-detail/model/useGroupDetail";
import { PageContainer } from "@/shared/ui";
import { styles } from "./GroupDetailPage.styles";
import { MemberList } from "./MemberList";

function GroupInfoSkeleton() {
  return (
    <>
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
    </>
  );
}

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const groupId = Number(id);

  const { group, error, isLoading } = useGroupDetail(groupId);

  return (
    <PageContainer>
      <button type="button" style={styles.backButton} onClick={() => navigate("/")}>
        <FaChevronLeft aria-hidden="true" />
        Groups
      </button>

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

          <MemberList groupId={groupId} />
        </>
      )}
    </PageContainer>
  );
}
