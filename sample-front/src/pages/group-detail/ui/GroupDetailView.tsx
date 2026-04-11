import type { ReactNode } from "react";
import { Box } from "@radix-ui/themes";

import type { UserSummary } from "@/pages/group-detail/model/group-detail";
import { PageContainer } from "@/shared/ui";
import { GroupDetailContent } from "./GroupDetailContent";
import { styles } from "./GroupDetailPage.styles";

type GroupDetailViewProps = {
  groupId: number;
  onMemberClick?: (member: UserSummary) => void;
  header?: ReactNode;
};

export function GroupDetailView({ groupId, onMemberClick, header }: GroupDetailViewProps) {
  return (
    <PageContainer>
      <Box style={styles.content}>
        {header}
        <GroupDetailContent key={groupId} groupId={groupId} onMemberClick={onMemberClick} />
      </Box>
    </PageContainer>
  );
}
