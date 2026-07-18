import React from 'react'
import { render, screen } from '@testing-library/react'
import ProgressMeter from '../ProgressMeter'

describe('ProgressMeter', () => {
  it('顯示 done/total 標籤', () => {
    render(<ProgressMeter done={8} total={12} />)
    expect(screen.getByText('8/12')).toBeInTheDocument()
  })

  it('progressbar aria 值正確', () => {
    render(<ProgressMeter done={8} total={12} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '8')
    expect(bar).toHaveAttribute('aria-valuemax', '12')
  })

  it('total 為 0 → 不崩潰，標籤 0/0', () => {
    render(<ProgressMeter done={0} total={0} />)
    expect(screen.getByText('0/0')).toBeInTheDocument()
  })

  it('showLabel=false → 不顯示文字標籤', () => {
    render(<ProgressMeter done={3} total={5} showLabel={false} />)
    expect(screen.queryByText('3/5')).not.toBeInTheDocument()
  })
})
