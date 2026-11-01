import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login page by default', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /edupro-uep/i });
  expect(heading).toBeInTheDocument();
});
