import { EntityItem } from '../types'

export const entities: EntityItem[] = [
  { entity_id:'ENT-ACTOR-A', case_id:'CASE-2026-001', type:'actor', label:'ShadowBroker (suspected actor)', confidence:78, aliases:['shadowbroker','shadow_broker','sb_operator'], is_synthetic:true },
  { entity_id:'ENT-ALIAS-1', case_id:'CASE-2026-001', type:'alias', label:'shadowbroker', confidence:85, aliases:[], is_synthetic:true },
  { entity_id:'ENT-ALIAS-2', case_id:'CASE-2026-001', type:'alias', label:'shadow_broker', confidence:82, aliases:[], is_synthetic:true },
  { entity_id:'ENT-DOC-1', case_id:'CASE-2026-001', type:'document', label:'doc_shadow_001.txt', confidence:90, aliases:[], is_synthetic:true },
  { entity_id:'ENT-DOC-2', case_id:'CASE-2026-001', type:'document', label:'doc_shadow_002.txt', confidence:90, aliases:[], is_synthetic:true },
  { entity_id:'ENT-WALLET-1', case_id:'CASE-2026-001', type:'wallet', label:'0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4', confidence:75, aliases:[], risk:72, is_synthetic:true },
  { entity_id:'ENT-DOMAIN-1', case_id:'CASE-2026-001', type:'domain', label:'darkweb-market.xyz', confidence:80, aliases:[], is_synthetic:true },
  { entity_id:'ENT-IP-1', case_id:'CASE-2026-001', type:'ip', label:'192.168.1.100', confidence:60, aliases:[], is_synthetic:true },
  { entity_id:'ENT-ACTOR-B', case_id:'CASE-2026-001', type:'actor', label:'CryptoKing (noisy unrelated)', confidence:35, aliases:['cryptoking'], is_synthetic:true },
  { entity_id:'ENT-ALIAS-B', case_id:'CASE-2026-001', type:'alias', label:'cryptoking', confidence:88, aliases:[], is_synthetic:true },
  { entity_id:'ENT-INFRA-1', case_id:'CASE-2026-014', type:'infrastructure', label:'AS 47583 — Hostinger ASN', confidence:68, aliases:[], is_synthetic:true },
  { entity_id:'ENT-WALLET-2', case_id:'CASE-2026-021', type:'wallet', label:'bc1qxy2k...fjhx0wlh', confidence:62, aliases:[], risk:40, is_synthetic:true },
]

export const wallets = [
  { wallet_id:'WAL-A1', case_id:'CASE-2026-001', address:'0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4', blockchain:'ethereum', label:'shadowbroker_primary', cluster_id:'CLUSTER-A', risk_score:72, evidence_ids:['EVD-003'] },
  { wallet_id:'WAL-A2', case_id:'CASE-2026-001', address:'0x1234567890123456789012345678901234567890', blockchain:'ethereum', label:'shadowbroker_counterparty', cluster_id:'CLUSTER-A', risk_score:65, evidence_ids:['EVD-003'] },
  { wallet_id:'WAL-B1', case_id:'CASE-2026-001', address:'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', blockchain:'bitcoin', label:'cryptoking_noise', cluster_id:'CLUSTER-B', risk_score:40, evidence_ids:['EVD-010'] },
]

export const osintRecords = [
  { record_id:'OSINT-001', source:'synthetic_alias_database', identifier:'shadowbroker', identifier_type:'alias', match_type:'exact', correlation_score:95, confidence:88, evidence_reference:'EVD-004', timestamp:'2026-01-10 08:00', raw_data:'SYNTHETIC: shadowbroker found in 2 forum posts, handle reuse confirmed' },
  { record_id:'OSINT-002', source:'synthetic_domain_database', identifier:'darkweb-market.xyz', identifier_type:'domain', match_type:'exact', correlation_score:90, confidence:85, evidence_reference:'EVD-004', timestamp:'2026-01-10 09:00', raw_data:'SYNTHETIC: domain linked to shadowbroker — WHOIS privacy overridden' },
  { record_id:'OSINT-003', source:'synthetic_wallet_database', identifier:'0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4', identifier_type:'wallet', match_type:'exact', correlation_score:92, confidence:80, evidence_reference:'EVD-003', timestamp:'2026-01-15 02:35', raw_data:'SYNTHETIC: wallet correlated to shadowbroker cluster via transaction timing' },
]

export const timeline: import('../types').TimelineEvent[] = [
  { event_id:'TL-001', timestamp:'2026-01-10 08:00', type:'domain_registered', title:'Domain registered: darkweb-market.xyz', description:'SYNTHETIC: Domain registered by shadowbroker alias', source:'synthetic_osint', entity_id:'ENT-DOMAIN-1', evidence_ids:'EVD-004' },
  { event_id:'TL-002', timestamp:'2026-01-12 10:00', type:'document_created', title:'Document created: doc_shadow_001.txt', description:'First shadowbroker document ingested', source:'artifact_ingestion', entity_id:'ENT-DOC-1', evidence_ids:'EVD-001' },
  { event_id:'TL-003', timestamp:'2026-01-13 14:30', type:'document_created', title:'Document created: doc_shadow_002.txt', description:'Second document with similar writing style', source:'artifact_ingestion', entity_id:'ENT-DOC-2', evidence_ids:'EVD-002' },
  { event_id:'TL-004', timestamp:'2026-01-15 02:30', type:'wallet_transaction', title:'ETH transfer 2.5 ETH', description:'Wallet 0x742d… → 0x1234… 2.5 ETH (block 19200000)', source:'synthetic_blockchain', entity_id:'ENT-WALLET-1', evidence_ids:'EVD-003' },
  { event_id:'TL-005', timestamp:'2026-01-15 08:00', type:'infrastructure_observed', title:'IP observed: 192.168.1.100', description:'Infrastructure identifier reused — possible VPN', source:'technical_fingerprint', entity_id:'ENT-IP-1', evidence_ids:'EVD-005' },
]
