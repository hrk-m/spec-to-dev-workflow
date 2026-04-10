import { useEffect, useState } from "react";
import { useLocation, useMatch, useNavigate } from "react-router";

import {
  GroupDetailPage,
  GroupDetailSheet,
  MemberDetailSheet,
  type Member,
} from "@/pages/group-detail";
import { HomePage } from "@/pages/home";
import { useSheetStack } from "@/shared/lib/sheet-stack";
import { Sheet, sheetConstants } from "@/shared/ui";

type GroupDetailRouteState = {
  presentation?: "sheet";
};

const GROUP_DETAIL_SHEET_Z_INDEX = sheetConstants.baseZIndex - 2;

function hasSheetPresentation(state: unknown): state is GroupDetailRouteState {
  return (
    typeof state === "object" &&
    state !== null &&
    "presentation" in state &&
    state.presentation === "sheet"
  );
}

function GroupDetailRouteSheet({ groupId }: { groupId: number }) {
  const navigate = useNavigate();
  const { openSheet, sheets } = useSheetStack();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setClosing(false);
  }, [groupId]);

  return (
    <Sheet
      onClose={() => setClosing(true)}
      onRemove={() => navigate(-1)}
      closing={closing}
      isTopMost={sheets.length === 0}
      zIndex={GROUP_DETAIL_SHEET_Z_INDEX}
      width={
        sheets.some((s) => !s.closing) ? sheetConstants.fullWidth : sheetConstants.defaultWidth
      }
    >
      <GroupDetailSheet
        groupId={groupId}
        onMemberClick={(member: Member) =>
          openSheet({
            id: `member-${member.id}`,
            content: <MemberDetailSheet member={member} />,
          })
        }
      />
    </Sheet>
  );
}

export function GroupNavigationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const groupDetailMatch = useMatch("/groups/:id");

  const handleGroupClick = (groupId: number) => {
    navigate(`/groups/${String(groupId)}`, { state: { presentation: "sheet" } });
  };

  if (!groupDetailMatch) {
    return <HomePage onGroupClick={handleGroupClick} />;
  }

  const groupId = Number(groupDetailMatch.params.id);

  if (!hasSheetPresentation(location.state)) {
    return <GroupDetailPage />;
  }

  return (
    <>
      <div inert style={{ display: "contents" }}>
        <HomePage onGroupClick={handleGroupClick} />
      </div>
      <GroupDetailRouteSheet groupId={groupId} />
    </>
  );
}
