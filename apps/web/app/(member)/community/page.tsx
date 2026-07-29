import { Room } from '../../../design-system/components/room';
import { PlaceholderSurface } from '../../../design-system/layout';

export default function CommunityPage() {
  return (
    <Room title="Community Space" description="A place to gather with other members walking a similar path.">
      <PlaceholderSurface
        title="Community is warming up"
        description="Your Steward is preparing a space for shared stories, pods, and encouragement. It will open here when it's ready."
      />
    </Room>
  );
}
