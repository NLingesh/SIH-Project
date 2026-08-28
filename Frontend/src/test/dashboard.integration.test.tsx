import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth'
import { Dashboard } from '../pages/Dashboard'
import { jsonResponse } from './setup'

const session = {
  token: 'jwt-dashboard-token',
  clearance_level: 3,
  investigator: {
    id: 'user-1',
    investigator_id: 'INV-ATLAS-001',
    full_name: 'Asha Rao',
    email: 'asha@example.test',
    clearance_level: 3,
    is_active: true,
    created_at: '2026-08-28T08:00:00Z',
  },
}

const caseRecord = {
  id: 'case-db-1',
  case_id: 'CASE-2026-001',
  title: 'ShadowBroker attribution investigation',
  description: 'Correlate an anonymous actor across aliases and infrastructure.',
  investigator_id: 'INV-ATLAS-001',
  authorization_ref: 'AUTH-2026-041',
  status: 'active',
  priority: 'high',
  classification: 'confidential',
  created_at: '2026-08-27T08:00:00Z',
  updated_at: '2026-08-28T08:00:00Z',
}

function renderDashboard() {
  window.localStorage.setItem('dt_token', session.token)
  window.localStorage.setItem('dt_session', JSON.stringify(session))
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workspace" element={<div data-testid="workspace-route">Workspace opened</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('deanonymization dashboard integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('loads live attribution data, renders the methodology, and carries the session token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input)
      if (url.includes('/cases?limit=100')) return jsonResponse({ cases: [caseRecord], total: 1, page: 1, limit: 100 })
      if (url.includes('/cases/CASE-2026-001/evidence')) return jsonResponse([{ id: 'ev-1', evidence_id: 'EVD-001', artifact_id: 'ART-001', signal_type: 'writing_style', feature: 'Stylometric overlap', score: 88, confidence: 84, is_synthetic: false, created_at: '2026-08-28T08:01:00Z' }])
      if (url.includes('/cases/CASE-2026-001/entities')) return jsonResponse([{ id: 'entity-1', entity_id: 'ENT-001', case_id: 'CASE-2026-001', type: 'actor', canonical_label: 'Candidate Alpha', confidence: 82, is_synthetic: false, created_at: '2026-08-28T08:01:00Z', updated_at: '2026-08-28T08:01:00Z', aliases: [] }])
      if (url.includes('/cases/CASE-2026-001/confidence')) return jsonResponse({ id: 'score-1', score_id: 'SCORE-001', case_id: 'CASE-2026-001', overall_confidence: 82, stylometry_score: 88, blockchain_score: 76, osint_score: 80, technical_fingerprint_score: 79, temporal_score: 81, evidence_count: 1, explanation: 'Multiple independent correlations support this identity lead.', uncertainty_factors: 'Requires analyst verification.', model_version: 'atlas-1', is_synthetic: false, created_at: '2026-08-28T08:02:00Z', updated_at: '2026-08-28T08:02:00Z' })
      if (url.includes('/system/status')) return jsonResponse({ api: 'healthy', postgresql: 'healthy', neo4j: 'healthy', analysis_engine: 'healthy', overall_status: 'healthy', version: '1.0.0', timestamp: '2026-08-28T08:03:00Z' })
      throw new Error(`Unexpected API request: ${url}`)
    })

    renderDashboard()

    expect(await screen.findByText('Trace an anonymous actor, Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('How Atlas narrows an anonymous actor')).toBeInTheDocument()
    expect(screen.getByText('Collect')).toBeInTheDocument()
    expect(screen.getByText('Correlate')).toBeInTheDocument()
    expect(screen.getByText('Resolve')).toBeInTheDocument()
    expect(screen.getByText('Verify')).toBeInTheDocument()
    expect(screen.getByText('ShadowBroker attribution investigation')).toBeInTheDocument()
    expect(screen.getByText('Attribution investigations')).toBeInTheDocument()
    expect(screen.getAllByText('82%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('healthy').length).toBeGreaterThan(0)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    const casesCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/cases?limit=100'))
    const headers = casesCall?.[1]?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer jwt-dashboard-token')
  })

  it('opens the selected investigation in the workspace from the live table row', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input)
      if (url.includes('/cases?limit=100')) return jsonResponse({ cases: [caseRecord], total: 1, page: 1, limit: 100 })
      if (url.includes('/cases/CASE-2026-001/evidence')) return jsonResponse([])
      if (url.includes('/cases/CASE-2026-001/entities')) return jsonResponse([])
      if (url.includes('/cases/CASE-2026-001/confidence')) return jsonResponse({ id: 'score-1', score_id: 'SCORE-001', case_id: 'CASE-2026-001', overall_confidence: 0, evidence_count: 0, model_version: 'atlas-1', is_synthetic: true, created_at: '2026-08-28T08:02:00Z', updated_at: '2026-08-28T08:02:00Z' })
      if (url.includes('/system/status')) return jsonResponse({ api: 'healthy', postgresql: 'healthy', neo4j: 'unavailable', analysis_engine: 'healthy', overall_status: 'degraded', version: '1.0.0', timestamp: '2026-08-28T08:03:00Z' })
      throw new Error(`Unexpected API request: ${url}`)
    })

    renderDashboard()
    await userEvent.setup().click(await screen.findByText('ShadowBroker attribution investigation'))

    expect(await screen.findByTestId('workspace-route')).toBeInTheDocument()
  })
})
