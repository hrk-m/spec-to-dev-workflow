export type Group = {
  id: number;
  name: string;
  description: string;
  member_count: number;
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
};

export type GroupsResponse = {
  groups: Group[];
  pagination: Pagination;
};

export type GroupSearchParams = {
  search: string;
  page: number;
  limit: number;
};
