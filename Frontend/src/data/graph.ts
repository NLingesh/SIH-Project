import { GraphNode, GraphEdge } from '../types'

export const graphNodes: GraphNode[] = [
  { id:'shadowbroker', label:'ShadowBroker', type:'actor', confidence:78 },
  { id:'shadow_alias', label:'shadowbroker', type:'alias', confidence:85 },
  { id:'shadow_alias2', label:'shadow_broker', type:'alias', confidence:82 },
  { id:'doc1', label:'doc_shadow_001.txt', type:'document', confidence:90 },
  { id:'doc2', label:'doc_shadow_002.txt', type:'document', confidence:90 },
  { id:'wallet1', label:'0x742d…b8D4', type:'wallet', confidence:75 },
  { id:'wallet2', label:'0x1234…7890', type:'wallet', confidence:65 },
  { id:'domain', label:'darkweb-market.xyz', type:'domain', confidence:80 },
  { id:'ip', label:'192.168.1.100', type:'ip', confidence:60 },
  { id:'crypto', label:'cryptoking', type:'alias', confidence:35 },
]

export const graphEdges: GraphEdge[] = [
  { id:'e1', source:'shadow_alias', target:'shadow_alias2', type:'ALIAS_REUSE', confidence:85, evidence_ids:['EVD-004'] },
  { id:'e2', source:'doc1', target:'doc2', type:'WRITING_SIMILARITY', confidence:84, evidence_ids:['EVD-001','EVD-002'] },
  { id:'e3', source:'wallet1', target:'wallet2', type:'WALLET_TRANSACTION', confidence:88, evidence_ids:['EVD-003'] },
  { id:'e4', source:'shadow_alias', target:'domain', type:'DOMAIN_ASSOCIATION', confidence:90, evidence_ids:['EVD-004'] },
  { id:'e5', source:'wallet1', target:'domain', type:'INFRASTRUCTURE_OVERLAP', confidence:76, evidence_ids:['EVD-005'] },
  { id:'e6', source:'doc1', target:'wallet1', type:'TEMPORAL_CORRELATION', confidence:81, evidence_ids:['EVD-006'] },
  { id:'e7', source:'doc1', target:'shadow_alias', type:'AUTHORSHIP_LEAD', confidence:82, evidence_ids:['EVD-001'] },
  { id:'e8', source:'ip', target:'domain', type:'INFRASTRUCTURE_OVERLAP', confidence:68, evidence_ids:['EVD-005'] },
  { id:'e9', source:'crypto', target:'wallet2', type:'NO_LINK', confidence:30, evidence_ids:['EVD-008'] },
]

export const reviewItems: import('../types').ReviewItem[] = [
  { review_id:'REV-001', case_id:'CASE-2026-001', entity_label:'ShadowBroker ↔ darkweb-market.xyz', entity_type:'domain', lead_type:'DOMAIN_ASSOCIATION', confidence:80, status:'pending', submitted_at:'2026-01-27 10:15', signals:['osint','temporal'] },
  { review_id:'REV-002', case_id:'CASE-2026-001', entity_label:'doc_shadow_001 ↔ doc_shadow_002', entity_type:'document', lead_type:'WRITING_SIMILARITY', confidence:84, status:'pending', submitted_at:'2026-01-27 10:10', signals:['stylometry'] },
  { review_id:'REV-003', case_id:'CASE-2026-001', entity_label:'0x742d…b8D4 cluster', entity_type:'wallet', lead_type:'WALLET_TRANSACTION', confidence:75, status:'pending', submitted_at:'2026-01-27 09:55', signals:['blockchain','temporal'] },
  { review_id:'REV-004', case_id:'CASE-2026-014', entity_label:'Phishing TLS cert overlap', entity_type:'infrastructure', lead_type:'INFRASTRUCTURE_OVERLAP', confidence:68, status:'pending', submitted_at:'2026-01-27 18:50', signals:['technical_fingerprint'] },
  { review_id:'REV-005', case_id:'CASE-2026-009', entity_label:'Vendor handle x0r_99', entity_type:'alias', lead_type:'ALIAS_REUSE', confidence:71, status:'requires_more', submitted_at:'2026-01-26 10:02', signals:['stylometry','osint'] },
  { review_id:'REV-006', case_id:'CASE-2026-001', entity_label:'cryptoking — conflicting signal', entity_type:'alias', lead_type:'POTENTIAL ASSOCIATION', confidence:35, status:'rejected', submitted_at:'2026-01-20 11:00', signals:['stylometry','blockchain'] },
]
