import { Box, Text } from "@radix-ui/themes";

import type { UserSummary } from "@/pages/group-detail/model/group-detail";

type MemberDetailSheetProps = {
  member: UserSummary;
};

export function MemberDetailSheet({ member }: MemberDetailSheetProps) {
  return (
    <Box style={{ padding: "0 24px 24px" }}>
      <Text as="p" style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
        {member.last_name} {member.first_name}
      </Text>
      <Text as="p" style={{ fontSize: 15, color: "#6E6E73", marginTop: 12 }}>
        詳細は今後追加予定
      </Text>
    </Box>
  );
}
