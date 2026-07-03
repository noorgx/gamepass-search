import { render, screen, fireEvent } from '@testing-library/react'
import FilterSidebar from './FilterSidebar'

const DEFAULT_FILTERS = {
  q: '', genre: [], platform: [], multiplayer: [], tier: [],
  yearMin: '', yearMax: '', metaMin: '', metaMax: '',
  newOnly: false, leavingSoon: false,
}

it('renders all filter sections', () => {
  const onUpdate = vi.fn()
  render(<FilterSidebar filters={DEFAULT_FILTERS} onUpdate={onUpdate} onReset={vi.fn()} />)
  expect(screen.getByText(/genre/i)).toBeInTheDocument()
  expect(screen.getByText(/platform/i)).toBeInTheDocument()
  expect(screen.getByText(/multiplayer/i)).toBeInTheDocument()
  expect(screen.getByText(/release year/i)).toBeInTheDocument()
  expect(screen.getByText(/metacritic/i)).toBeInTheDocument()
  expect(screen.getByText(/tier/i)).toBeInTheDocument()
  expect(screen.getByText(/new.*30/i)).toBeInTheDocument()
  expect(screen.getByText(/leaving soon/i)).toBeInTheDocument()
})

it('calls onUpdate when Console checkbox is clicked', () => {
  const onUpdate = vi.fn()
  render(<FilterSidebar filters={DEFAULT_FILTERS} onUpdate={onUpdate} onReset={vi.fn()} />)
  fireEvent.click(screen.getByLabelText(/console/i))
  expect(onUpdate).toHaveBeenCalledWith('platform', ['Console'])
})

it('calls onReset when Reset button is clicked', () => {
  const onReset = vi.fn()
  render(<FilterSidebar filters={DEFAULT_FILTERS} onUpdate={vi.fn()} onReset={onReset} />)
  fireEvent.click(screen.getByRole('button', { name: /reset/i }))
  expect(onReset).toHaveBeenCalledTimes(1)
})

it('reflects newOnly toggle state', () => {
  const onUpdate = vi.fn()
  render(<FilterSidebar filters={{ ...DEFAULT_FILTERS, newOnly: true }} onUpdate={onUpdate} onReset={vi.fn()} />)
  expect(screen.getByLabelText(/new.*30/i)).toBeChecked()
})
