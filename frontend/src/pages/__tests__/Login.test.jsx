import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import Login from '../Login'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, login: vi.fn() }),
}))

vi.mock('../../services/api', () => ({
  api: { getProfile: vi.fn(), syncAvatar: vi.fn() },
  mapMember: vi.fn((d) => d),
}))

describe('Login', () => {
  it('renders dynamic-width content wrapper inside full-screen background', () => {
    const { container } = render(<Login />)
    const wrapper = container.querySelector('[data-testid="login-content"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper.classList.contains('w-full')).toBe(true)
  })
})
