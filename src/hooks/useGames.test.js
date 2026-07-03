import { renderHook, waitFor } from '@testing-library/react'
import { useGames } from './useGames'

global.fetch = vi.fn()

const DEFAULT_FILTERS = {
  q: '', genre: [], platform: [], multiplayer: [], tier: [],
  yearMin: '', yearMax: '', metaMin: '', metaMax: '',
  newOnly: false, leavingSoon: false,
}

beforeEach(() => {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ total: 2, games: [{ id: 'A', title: 'Alpha' }, { id: 'B', title: 'Beta' }] })
  })
})

afterEach(() => vi.clearAllMocks())

it('fetches games on mount', async () => {
  const { result } = renderHook(() => useGames(DEFAULT_FILTERS))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.games).toHaveLength(2)
  expect(result.current.total).toBe(2)
})

it('includes q param when filter has search text', async () => {
  renderHook(() => useGames({ ...DEFAULT_FILTERS, q: 'halo' }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  const url = global.fetch.mock.calls[0][0]
  expect(url).toContain('q=halo')
})

it('includes newOnly param when filter is true', async () => {
  renderHook(() => useGames({ ...DEFAULT_FILTERS, newOnly: true }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  expect(global.fetch.mock.calls[0][0]).toContain('newOnly=true')
})
