import { FaChevronLeft } from "react-icons/fa6";
import { useNavigate, useParams } from "react-router";

import { useSheetStack } from "@/shared/lib/sheet-stack";
import { styles } from "./GroupDetailPage.styles";
import { GroupDetailView } from "./GroupDetailView";
import { MemberDetailSheet } from "./MemberDetailSheet";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openSheet } = useSheetStack();
  const groupId = Number(id);

  return (
    <GroupDetailView
      groupId={groupId}
      onMemberClick={(member) =>
        openSheet({
          id: `member-${member.id}`,
          content: <MemberDetailSheet member={member} />,
        })
      }
      header={
        <button
          type="button"
          data-testid="back-button"
          style={styles.backButton}
          onClick={() => navigate("/")}
        >
          <FaChevronLeft size={14} aria-hidden="true" />
          Groups
        </button>
      }
    />
  );
}
