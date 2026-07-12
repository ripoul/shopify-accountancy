import { describe, it, expect } from 'vitest'
import { stripedRowSx } from '../../utils/tableStyles'

describe('stripedRowSx', () => {
  it('returns no background for even indices', () => {
    expect(stripedRowSx(0)).toEqual({})
    expect(stripedRowSx(2)).toEqual({})
  })

  it('returns the hover background for odd indices', () => {
    expect(stripedRowSx(1)).toEqual({ bgcolor: 'action.hover' })
    expect(stripedRowSx(3)).toEqual({ bgcolor: 'action.hover' })
  })
})
