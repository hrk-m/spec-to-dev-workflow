export type User = {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
};

export type UsersResponse = {
  users: User[];
  total: number;
};

export type FetchUsersParams = {
  q?: string;
  limit?: number;
  offset?: number;
};
