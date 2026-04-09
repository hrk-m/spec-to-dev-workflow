export type Group = {
  id: number;
  name: string;
  description: string;
  member_count: number;
};

export type GroupsResponse = {
  groups: Group[];
  total: number;
};

export type FetchGroupsParams = {
  q?: string;
  limit?: number;
  offset?: number;
};

export type CreateGroupRequest = {
  name: string;
  description: string;
};

export type CreateGroupResponse = Group;
