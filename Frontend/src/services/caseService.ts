import { api, createReview, getCase, listCases, runAnalysis, type ApiCase } from './api'

export { createReview, getCase, listCases, runAnalysis }

export async function createCase(payload: {
  title: string
  description?: string
  investigator_id: string
  authorization_ref?: string
  priority?: string
  classification?: string
}): Promise<ApiCase> {
  return api<ApiCase>('/cases', { method: 'POST', body: JSON.stringify(payload) })
}

export const caseService = {
  list: listCases,
  get: getCase,
  create: createCase,
  async createLegacy(payload: {
    title: string
    description?: string
    investigator_id: string
    authorization_ref?: string
    priority?: string
    classification?: string
  }): Promise<ApiCase> {
    return createCase(payload)
  },
}
