import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce.js'

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))
    expect(result.current).toBe('initial')
  })

  it('delays updating the returned value until after the delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'first' },
    })

    rerender({ value: 'second' })
    // Value shouldn't change yet -- the debounce delay hasn't elapsed
    expect(result.current).toBe('first')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('second')
    vi.useRealTimers()
  })
})
