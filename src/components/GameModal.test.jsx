import { render, screen, fireEvent } from '@testing-library/react'
import GameModal from './GameModal'

const game = {
  id: 'G1',
  title: 'Halo Infinite',
  description: 'A great shooter game.',
  developer: 'Infinite Studios',
  publisher: 'Xbox Game Studios',
  release_year: 2021,
  metacritic: 87,
  genre: '["Shooter","Action"]',
  platforms: '["Console","PC","Cloud"]',
  multiplayer: '["Online","Co-op"]',
  tier: 'Premium',
  image_url: null,
  added_date: '2026-01-01',
  leaving_date: null,
}

it('renders game title', () => {
  render(<GameModal game={game} onClose={() => {}} />)
  expect(screen.getByText('Halo Infinite')).toBeInTheDocument()
})

it('renders description', () => {
  render(<GameModal game={game} onClose={() => {}} />)
  expect(screen.getByText('A great shooter game.')).toBeInTheDocument()
})

it('renders developer and publisher', () => {
  render(<GameModal game={game} onClose={() => {}} />)
  expect(screen.getByText(/Infinite Studios/)).toBeInTheDocument()
  expect(screen.getByText(/Xbox Game Studios/)).toBeInTheDocument()
})

it('calls onClose when backdrop is clicked', () => {
  const onClose = vi.fn()
  render(<GameModal game={game} onClose={onClose} />)
  fireEvent.click(screen.getByTestId('modal-backdrop'))
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('calls onClose when Escape key is pressed', () => {
  const onClose = vi.fn()
  render(<GameModal game={game} onClose={onClose} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
})
