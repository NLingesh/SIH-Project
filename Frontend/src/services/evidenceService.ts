import { evidence, artifacts } from '../data/evidence'
export const evidenceService = {
  async list(){ return evidence },
  async listArtifacts(){ return artifacts },
  async getEvidence(id:string){ return evidence.find(e=>e.evidence_id===id) },
}
