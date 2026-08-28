import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth'
import { Login } from '../pages/Login'
import { ToastProvider } from '../components/common/Toast'
import { jsonResponse } from './setup'

const investigator = {
  id: 'user-1',
  investigator_id: 'INV-ATLAS-001',
  full_name: 'Asha Rao',
  email: 'asha@example.test',
  clearance_level: 3,
  is_active: true,
  created_at: '2026-08-28T08:00:00Z',
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<div data-testid="authenticated-route">Authenticated workspace</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('authentication flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('requires both investigator ID and passphrase before contacting the backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    renderLogin()

    await userEvent.setup().click(screen.getByRole('button', { name: /authenticate/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Investigator ID and security passphrase are required.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('authenticates through the backend, persists the JWT session, and redirects', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ access_token: 'jwt-test-token', token_type: 'bearer', investigator, clearance_level: 3 }),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('INV-DEMO-001'), '  INV-ATLAS-001  ')
    await user.type(screen.getByPlaceholderText('Enter your passphrase'), 'authorized-passphrase')
    await user.click(screen.getByRole('button', { name: /authenticate/i }))

    await waitFor(() => expect(screen.getByTestId('authenticated-route')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ investigator_id: 'INV-ATLAS-001', security_passphrase: 'authorized-passphrase' }),
      }),
    )
    expect(window.localStorage.getItem('dt_token')).toBe('jwt-test-token')
    expect(JSON.parse(window.localStorage.getItem('dt_session') || '{}')).toMatchObject({ investigator, clearance_level: 3 })
  })

  it('shows the backend error and does not create a session when authentication fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid investigator ID or passphrase', request_id: 'req-1' } }, 401),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('INV-DEMO-001'), 'INV-ATLAS-001')
    await user.type(screen.getByPlaceholderText('Enter your passphrase'), 'wrong-passphrase')
    await user.click(screen.getByRole('button', { name: /authenticate/i }))

    await waitFor(() => expect(screen.getAllByRole('alert').some(element => element.textContent?.includes('Invalid investigator ID or passphrase'))).toBe(true))
    expect(screen.queryByTestId('authenticated-route')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('dt_token')).toBeNull()
  })
})
