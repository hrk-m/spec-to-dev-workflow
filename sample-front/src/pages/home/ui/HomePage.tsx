import { GroupList } from "./GroupList";

type HomePageProps = {
  onGroupClick?: (groupId: number) => void;
};

export function HomePage({ onGroupClick }: HomePageProps) {
  return <GroupList onGroupClick={onGroupClick} />;
}
