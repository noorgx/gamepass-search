import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Header from './Header'

global.fetch = vi.fn()

beforeEach(() => {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ last_synced: '2026-07-03T10:00:00.000Z', total: 428 })
  })
})

afterEach(() => vi.clearAllMocks())

it('renders the app title', async () => {
  render(<Header total={428} />)
  expect(screen.getByText('🎮 Game Pass Search')).toBeInTheDocument()
})

it('shows total game count', async () => {
  render(<Header total={428} />)
  await waitFor(() => expect(screen.getByText(/428 games/i)).toBeInTheDocument())
})

it('shows Sync Now button', async () => {
  render(<Header total={0} />)
  expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument()
})

it('shows syncing state while POST /api/sync is in-flight', async () => {
  let resolve
  vi.mocked(global.fetch)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ last_synced: null, total: 0 }) })
    .mockReturnValueOnce(new Promise(r => { resolve = r }))

  render(<Header total={0} />)
  await waitFor(() => screen.getByRole('button', { name: /sync now/i }))
  fireEvent.click(screen.getByRole('button', { name: /sync now/i }))
  expect(await screen.findByRole('button', { name: /syncing/i })).toBeDisabled()
  resolve({ ok: true, json: async () => ({ added: 5, synced_at: new Date().toISOString() }) })
})
