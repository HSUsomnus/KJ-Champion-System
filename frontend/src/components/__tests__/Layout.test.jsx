import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import Layout from '../Layout'

vi.mock('../SidebarNav', () => ({
  default: () => <nav data-testid="sidebar-nav" />,
}))

describe('Layout', () => {
  it('renders SidebarNav and dynamic-width center wrapper containing Outlet', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<div data-testid="page-content">content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    const sidebarNav = screen.getByTestId('sidebar-nav')
    const pageContent = screen.getByTestId('page-content')
    const centerWrapper = container.querySelector('[data-testid="layout-column"]')

    expect(sidebarNav).toBeInTheDocument()
    expect(pageContent).toBeInTheDocument()
    expect(centerWrapper).not.toBeNull()
    expect(centerWrapper).toContainElement(pageContent)
    expect(centerWrapper).not.toContainElement(sidebarNav)
  })
})
