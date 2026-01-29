import { render, screen } from '@testing-library/react';
import App from '../../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('initially shows lobby', () => {
    render(<App />);
    expect(screen.getByText(/AIR GUITAR PRO/i)).toBeInTheDocument();
  });
});
