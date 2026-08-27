import { cases } from '../data/cases'
import type { CaseItem } from '../types'
// import { api } from './api'

export const caseService = {
  async list(): Promise<CaseItem[]>{ /* return api('/cases') */ return cases },
  async get(caseId:string): Promise<CaseItem|undefined>{ return cases.find(c=>c.case_id===caseId) },
  async create(payload: Partial<CaseItem>): Promise<CaseItem>{ const c = { ...payload, case_id:`CASE-2026-${String(cases.length+1).padStart(3,'0')}`, id:String(Date.now()) } as CaseItem; cases.unshift(c); return c },
}
