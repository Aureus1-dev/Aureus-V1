import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { RoomTransition } from './RoomTransition';

describe('RoomTransition', () => {
  it('renders its children', () => {
    render(
      <RoomTransition pathname="/conversation">
        <p>Room content</p>
      </RoomTransition>,
    );
    expect(screen.getByText('Room content')).toBeInTheDocument();
  });

  it('remounts the region when the pathname changes, so a fresh entrance animation plays for the new Room', () => {
    const { rerender, container } = render(
      <RoomTransition pathname="/conversation">
        <p>Conversation</p>
      </RoomTransition>,
    );
    const firstRegion = container.firstElementChild;

    rerender(
      <RoomTransition pathname="/journey">
        <p>Journey</p>
      </RoomTransition>,
    );

    expect(screen.getByText('Journey')).toBeInTheDocument();
    expect(container.firstElementChild).not.toBe(firstRegion);
  });

  it('does not remount the region when the pathname is unchanged', () => {
    const { rerender, container } = render(
      <RoomTransition pathname="/conversation">
        <p>Conversation</p>
      </RoomTransition>,
    );
    const firstRegion = container.firstElementChild;

    rerender(
      <RoomTransition pathname="/conversation">
        <p>Conversation, updated</p>
      </RoomTransition>,
    );

    expect(container.firstElementChild).toBe(firstRegion);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <RoomTransition pathname="/conversation">
        <p>Room content</p>
      </RoomTransition>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
