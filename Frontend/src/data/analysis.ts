import { ConfidenceBreakdown } from '../types'

export const confidence: ConfidenceBreakdown = {
  overall:78,
  stylometry:84,
  blockchain:79,
  osint:91,
  technical:76,
  temporal:81,
  evidence_count:8,
  contributions:[
    { signal:'STYLOMETRY', score:84, weight:0.25, contribution:21.0 },
    { signal:'BLOCKCHAIN', score:79, weight:0.25, contribution:19.75 },
    { signal:'OSINT', score:91, weight:0.20, contribution:18.2 },
    { signal:'TECHNICAL', score:76, weight:0.15, contribution:11.4 },
    { signal:'TEMPORAL', score:81, weight:0.15, contribution:12.15 },
  ],
  explanation:'Overall 78% — OSINT strongest (91), stylometry 84, temporal 81. Conflicting noise evidence (22,30) lowers confidence by ~7 points. Multiple independent signals support lead but not definitive identification. Requires analyst verification.',
  uncertainty:'Synthetic demo baseline models; noisy/conflicting CryptoKing signals; VPN obfuscation possible; small document sample (n=2+1)'
}

export const signals = [
  {
    key:'stylometry',
    label:'STYLOMETRY',
    score:84,
    status:'strong_lead' as const,
    explanation:'Writing similarity between doc_shadow_001 and doc_shadow_002. Vocabulary richness overlap 0.84.',
    evidence:'EVD-001, EVD-002, EVD-007 (conflicting 22)',
    features:[
      { name:'Vocabulary richness', value:0.84 },
      { name:'Punctuation dist.', value:0.79 },
      { name:'Sentence length', value:0.81 },
      { name:'Function word freq', value:0.77 },
    ],
    limitations:['Baseline model trained on limited corpus','Noisy third doc reduces confidence','Requires analyst linguistic review'],
  },
  {
    key:'blockchain',
    label:'BLOCKCHAIN',
    score:79,
    status:'moderate_lead' as const,
    explanation:'Wallet co-occurrence and cluster linkage. Wallet 0x742d… linked to domain temporally.',
    evidence:'EVD-003, EVD-008 (no-link 30), EVD-010',
    features:[
      { name:'Cluster co-occurrence', value:0.88 },
      { name:'Transaction timing', value:0.79 },
      { name:'Counterparty overlap', value:0.71 },
    ],
    limitations:['Cluster attribution is heuristic','On-chain data is pseudonymous','Requires corroboration'],
  },
  {
    key:'osint',
    label:'OSINT',
    score:91,
    status:'strong_lead' as const,
    explanation:'Exact alias reuse across 2 authorized sources. Domain → alias linkage confirmed.',
    evidence:'EVD-004 — alias_reuse, OSINT-001/002',
    features:[
      { name:'Alias exact match', value:0.95 },
      { name:'Domain correlation', value:0.90 },
      { name:'Wallet correlation', value:0.92 },
    ],
    limitations:['Sources are synthetic demonstration','OSINT can contain stale data','Cross-source verification required'],
  },
  {
    key:'technical',
    label:'TECHNICAL / NETWORK',
    score:76,
    status:'moderate_lead' as const,
    explanation:'Infrastructure fingerprint: IP 192.168.1.100 reused across artifacts. May be VPN.',
    evidence:'EVD-005, EVD-009',
    features:[
      { name:'IP overlap', value:0.76 },
      { name:'TLS cert overlap', value:0.68 },
      { name:'ASN reuse', value:0.62 },
    ],
    limitations:['IP may be shared/VPN','NAT obfuscation','Requires network corroboration'],
  },
  {
    key:'temporal',
    label:'TEMPORAL CORRELATION',
    score:81,
    status:'strong_lead' as const,
    explanation:'Artifacts cluster within 48h window (Jan 13–15). Transaction + document creation overlap.',
    evidence:'EVD-006, Timeline TL-002→TL-004',
    features:[
      { name:'Window overlap (48h)', value:0.81 },
      { name:'Event burst density', value:0.74 },
      { name:'Cross-signal timing', value:0.79 },
    ],
    limitations:['Temporal proximity ≠ causation','Time zones normalized to UTC','Small sample window'],
  },
]

export const stylometryComparison = {
  docA:'doc_shadow_001.txt',
  docB:'doc_shadow_002.txt',
  similarity:84,
  model_version:'stylometry-v1.0.0-synthetic',
  top_features: [
    { feature:'vocabulary_richness', contribution:0.24, explanation:'Shared rare word usage' },
    { feature:'punctuation_distribution', contribution:0.19, explanation:'Similar comma/semicolon density' },
    { feature:'function_word_freq', contribution:0.16, explanation:'Overlap in stop-word patterns' },
    { feature:'sentence_length_avg', contribution:0.14, explanation:'Avg sentence len 18.2 vs 17.8' },
  ]
}
