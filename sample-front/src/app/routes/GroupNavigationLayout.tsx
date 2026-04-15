import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TbArrowsHorizontal } from "react-icons/tb";
import { useLocation, useMatch, useNavigate } from "react-router";

import {
  GroupDetailPage,
  GroupDetailSheet,
  MemberDetailSheet,
  type UserSummary,
} from "@/pages/group-detail";
import { HomePage } from "@/pages/home";
import { UsersPage } from "@/pages/users";
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
      headerActions={
        <button
          type="button"
          aria-label="Open full page"
          onClick={() => navigate(`/groups/${String(groupId)}`, { replace: true })}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <TbArrowsHorizontal size={16} />
        </button>
      }
    >
      <GroupDetailSheet
        groupId={groupId}
        onMemberClick={(member: UserSummary) =>
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
  const usersMatch = useMatch("/users");
  const { closeAll } = useSheetStack();
  const previousRouteKeyRef = useRef<string | null>(null);

  const isSheetPresentation = hasSheetPresentation(location.state);
  const routeKey = groupDetailMatch
    ? `${groupDetailMatch.params.id}:${isSheetPresentation ? "sheet" : "page"}`
    : usersMatch
      ? "users"
      : "home";

  useLayoutEffect(() => {
    const previousRouteKey = previousRouteKeyRef.current;

    if (previousRouteKey !== null && previousRouteKey !== routeKey && previousRouteKey !== "home") {
      closeAll();
    }

    previousRouteKeyRef.current = routeKey;
  }, [closeAll, routeKey]);

  const handleGroupClick = (groupId: number) => {
    navigate(`/groups/${String(groupId)}`, { state: { presentation: "sheet" } });
  };

  if (usersMatch) {
    return <UsersPage />;
  }

  if (!groupDetailMatch) {
    return <HomePage onGroupClick={handleGroupClick} />;
  }

  const groupId = Number(groupDetailMatch.params.id);

  if (!isSheetPresentation) {
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
