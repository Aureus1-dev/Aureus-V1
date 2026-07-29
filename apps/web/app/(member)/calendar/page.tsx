import { Room } from '../../../design-system/components/room';
import { PlaceholderSurface } from '../../../design-system/layout';

export default function CalendarPage() {
  return (
    <Room title="Calendar" description="A quiet place to see what's ahead on your journey.">
      <PlaceholderSurface
        title="Calendar is warming up"
        description="Your Steward will bring appointments, deadlines, and milestones together here when this room opens."
      />
    </Room>
  );
}
