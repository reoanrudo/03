import { render, screen } from '@testing-library/react';
import Lobby from '../Lobby';

describe('Lobby', () => {
  it('renders lobby title', () => {
    render(<Lobby onSelect={() => {}} initialRoomId="" />);
    expect(screen.getByText(/AIR GUITAR PRO/i)).toBeInTheDocument();
  });

  it('renders room code input', () => {
    render(<Lobby onSelect={() => {}} initialRoomId="" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('renders play buttons', () => {
    render(<Lobby onSelect={() => {}} initialRoomId="" />);
    expect(screen.getByText(/PC MODE/i)).toBeInTheDocument();
    expect(screen.getByText(/MOBILE MODE/i)).toBeInTheDocument();
  });
});
