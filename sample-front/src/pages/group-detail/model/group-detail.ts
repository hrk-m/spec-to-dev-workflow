export type GroupDetail = {
  id: number;
  name: string;
  description: string;
  member_count: number;
};

export type UserSummary = {
  id: number;
  first_name: string;
  last_name: string;
};

export type MembersResponse = {
  members: UserSummary[];
  total: number;
};
