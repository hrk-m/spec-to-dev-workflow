import type { UserSummary } from "@/pages/group-detail/model/group-detail";
import { GroupDetailView } from "./GroupDetailView";

type GroupDetailSheetProps = {
  groupId: number;
  onMemberClick?: (member: UserSummary) => void;
};

export function GroupDetailSheet({ groupId, onMemberClick }: GroupDetailSheetProps) {
  return <GroupDetailView groupId={groupId} onMemberClick={onMemberClick} />;
}
