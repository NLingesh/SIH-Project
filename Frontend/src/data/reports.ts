export const reportTemplate = {
  case_id:'CASE-2026-001',
  title:'Operation Shadow Broker — Investigation Report',
  classification:'CONFIDENTIAL // SYNTHETIC DEMONSTRATION DATA',
  authorization:'AUTH-2026-SYN-001',
  investigator:'INV-DEMO-001 — A. Sharma (Demo Investigator)',
  generated_at:'2026-01-27T14:20:00Z',
  summary:'SYNTHETIC DEMONSTRATION DATA: Multi-signal investigation of pseudonymous actor network. Five signals analyzed (stylometry, blockchain, OSINT, technical fingerprint, temporal). Overall confidence 78% (investigative lead, not definitive identification). Conflicting noise evidence lowers confidence.',
  artifacts: 5,
  evidence: 8,
  entities: 10,
  limitations: [
    'All data is synthetic / demonstration — baseline models only',
    'Noisy CryptoKing signals create conflicting evidence (22,30)',
    'Small document sample (n=2+1) limits stylometry generalizability',
    'IP reuse may be VPN/NAT — not definitive attribution',
    'Blockchain clustering is heuristic, pseudonymous by nature',
    'Analyst verification required before any operational action',
  ],
  recommendations:[
    'Analyst linguistic review of writing similarity features',
    'Expand wallet cluster search with additional temporal window',
    'Cross-verify OSINT sources against independent database',
    'Collect additional infrastructure identifiers',
  ]
}

export const auditEvents: import('../types').TimelineEvent[] = [
  { event_id:'AUD-001', timestamp:'2026-01-08 08:30', type:'case_created', title:'Case created', description:'CASE-2026-001 created by INV-DEMO-001', source:'system' },
  { event_id:'AUD-002', timestamp:'2026-01-12 10:00', type:'artifact_added', title:'Artifact ingested', description:'doc_shadow_001.txt — SHA256 verified', source:'INV-DEMO-001' },
  { event_id:'AUD-003', timestamp:'2026-01-15 02:30', type:'analysis_completed', title:'Analysis pipeline completed', description:'Full 5-signal pipeline — overall 78%', source:'system' },
  { event_id:'AUD-004', timestamp:'2026-01-27 10:15', type:'review_created', title:'Review submitted', description:'Lead DOMAIN_ASSOCIATION — requires review', source:'INV-DEMO-001' },
]
