import { api, getArtifacts, getEvidence, type ApiEvidence } from './api'

export { getArtifacts, getEvidence }

export const evidenceService = {
  list: getEvidence,
  listArtifacts: getArtifacts,
  async getEvidence(id: string): Promise<ApiEvidence> {
    return api<ApiEvidence>(`/evidence/${encodeURIComponent(id)}`)
  },
  async updateNotes(id: string, notes: string): Promise<ApiEvidence> {
    return api<ApiEvidence>(`/evidence/${encodeURIComponent(id)}/notes?notes=${encodeURIComponent(notes)}`, {
      method: 'PATCH',
    })
  },
}
