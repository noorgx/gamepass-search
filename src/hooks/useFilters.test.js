import { renderHook, act } from '@testing-library/react'
import { useFilters } from './useFilters'

describe('useFilters', () => {
  it('starts with empty/false defaults', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.filters.q).toBe('')
    expect(result.current.filters.genre).toEqual([])
    expect(result.current.filters.newOnly).toBe(false)
  })

  it('updateFilter changes a single key', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.updateFilter('q', 'halo'))
    expect(result.current.filters.q).toBe('halo')
    expect(result.current.filters.genre).toEqual([]) // others unchanged
  })

  it('resetFilters restores all defaults', () => {
    const { result } = renderHook(() => useFilters())
    act(() => {
      result.current.updateFilter('q', 'halo')
      result.current.updateFilter('newOnly', true)
    })
    act(() => result.current.resetFilters())
    expect(result.current.filters.q).toBe('')
    expect(result.current.filters.newOnly).toBe(false)
  })
})
