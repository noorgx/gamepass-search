import { render, screen, fireEvent } from '@testing-library/react'
import GameCard from './GameCard'

const game = {
  id: 'G1',
  title: 'Halo Infinite',
  metacritic: 87,
  platforms: '["Console","PC"]',
  tier: 'Premium',
  image_url: null,
  added_date: new Date().toISOString().split('T')[0],
  leaving_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
}

it('renders the game title', () => {
  render(<GameCard game={game} onSelect={() => {}} />)
  expect(screen.getByText('Halo Infinite')).toBeInTheDocument()
})

it('renders metacritic score', () => {
  render(<GameCard game={game} onSelect={() => {}} />)
  expect(screen.getByText('87')).toBeInTheDocument()
})

it('shows Leaving Soon badge when leaving within 30 days', () => {
  render(<GameCard game={game} onSelect={() => {}} />)
  expect(screen.getByText(/leaving soon/i)).toBeInTheDocument()
})

it('shows New badge when added in last 30 days', () => {
  render(<GameCard game={game} onSelect={() => {}} />)
  expect(screen.getByText(/new/i)).toBeInTheDocument()
})

it('calls onSelect when clicked', () => {
  const onSelect = vi.fn()
  render(<GameCard game={game} onSelect={onSelect} />)
  fireEvent.click(screen.getByText('Halo Infinite'))
  expect(onSelect).toHaveBeenCalledWith(game)
})
