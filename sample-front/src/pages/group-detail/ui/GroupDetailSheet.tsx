import type { Member } from "@/pages/group-detail/model/group-detail";
import { GroupDetailView } from "./GroupDetailView";

type GroupDetailSheetProps = {
  groupId: number;
  onMemberClick?: (member: Member) => void;
};

export function GroupDetailSheet({ groupId, onMemberClick }: GroupDetailSheetProps) {
  return <GroupDetailView groupId={groupId} onMemberClick={onMemberClick} />;
}
