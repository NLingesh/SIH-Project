import { CaseItem } from '../types'
export const cases: CaseItem[] = [
  {
    id:'1', case_id:'CASE-2026-001', title:'Operation Shadow Broker — Synthetic Demonstration', investigator:'INV-DEMO-001 — A. Sharma', authorization_ref:'AUTH-2026-SYN-001',
    status:'active', priority:'critical', classification:'confidential',
    created_at:'2026-01-08T08:30:00Z', updated_at:'2026-01-16T14:20:00Z',
    evidence_count:8, confidence:78, entities:10, artifacts:5,
    description:'SYNTHETIC / DEMONSTRATION DATA: Investigation of pseudonymous actor network with writing similarity, blockchain transactions, OSINT correlations, and technical fingerprints.'
  },
  {
    id:'2', case_id:'CASE-2026-002', title:'Crypto Exchange Anomaly — Synthetic', investigator:'INV-DEMO-001 — A. Sharma', authorization_ref:'AUTH-2026-SYN-002',
    status:'open', priority:'high', classification:'unclassified',
    created_at:'2026-01-10T09:00:00Z', updated_at:'2026-01-15T11:00:00Z',
    evidence_count:4, confidence:34, entities:6, artifacts:3,
    description:'SYNTHETIC: Secondary case showing noisy/conflicting signals and isolated wallet activity.'
  },
  {
    id:'3', case_id:'CASE-2026-014', title:'Phishing Kit Infrastructure Reuse — Mumbai Region', investigator:'INV-0421 — R. Desai', authorization_ref:'AUTH-2026-MH-014',
    status:'active', priority:'high', classification:'confidential',
    created_at:'2026-01-18T07:12:00Z', updated_at:'2026-01-27T18:45:00Z',
    evidence_count:22, confidence:64, entities:18, artifacts:14,
    description:'Infrastructure overlap across three phishing domains, shared TLS cert fingerprint and registrant alias reuse.'
  },
  {
    id:'4', case_id:'CASE-2026-009', title:'Darknet Market Vendor — Alias Cluster', investigator:'INV-0311 — S. Iyer', authorization_ref:'AUTH-2026-DN-009',
    status:'active', priority:'medium', classification:'secret',
    created_at:'2026-01-05T13:00:00Z', updated_at:'2026-01-26T10:10:00Z',
    evidence_count:15, confidence:71, entities:12, artifacts:9,
    description:'Stylometry and PGP key correlation across vendor handles on two marketplaces. Requires OSINT verification.'
  },
  {
    id:'5', case_id:'CASE-2026-021', title:'Ransomware Affiliate — Wallet Tracing', investigator:'INV-0190 — K. Verma', authorization_ref:'AUTH-2026-RW-021',
    status:'open', priority:'critical', classification:'secret',
    created_at:'2026-02-02T06:20:00Z', updated_at:'2026-02-04T16:00:00Z',
    evidence_count:31, confidence:82, entities:24, artifacts:19,
    description:'Blockchain cluster expansion from initial ransom payment; temporal correlation with intrusion telemetry.'
  },
  {
    id:'6', case_id:'CASE-2025-188', title:'SIM-Swap Fraud — OSINT Correlation', investigator:'INV-0277 — P. Nair', authorization_ref:'AUTH-2025-SIM-188',
    status:'closed', priority:'medium', classification:'confidential',
    created_at:'2025-11-20T10:00:00Z', updated_at:'2025-12-18T15:30:00Z',
    evidence_count:11, confidence:88, entities:8, artifacts:7,
    description:'Confirmed lead — telecom OSINT + banking artifact correlation. Report archived with judicial authorization.'
  },
  {
    id:'7', case_id:'CASE-2026-003', title:'Credential Stuffing — Infrastructure Fingerprint', investigator:'INV-0402 — M. Khan', authorization_ref:'AUTH-2026-CS-003',
    status:'open', priority:'low', classification:'unclassified',
    created_at:'2026-02-10T08:00:00Z', updated_at:'2026-02-12T09:30:00Z',
    evidence_count:6, confidence:41, entities:7, artifacts:4,
    description:'HTTP header fingerprint and ASN overlap suggest common tooling. Low confidence — requires more evidence.'
  },
  {
    id:'8', case_id:'CASE-2026-007', title:'Investment Scam Network — Temporal Burst', investigator:'INV-DEMO-001 — A. Sharma', authorization_ref:'AUTH-2026-IS-007',
    status:'active', priority:'high', classification:'confidential',
    created_at:'2026-01-22T11:40:00Z', updated_at:'2026-01-28T12:00:00Z',
    evidence_count:18, confidence:59, entities:15, artifacts:11,
    description:'Multiple scam domains registered within 36h window; wallet funding overlaps with alias posting times.'
  },
]

export const recentActivity = [
  { id:'a1', case_id:'CASE-2026-001', action:'Analysis completed', detail:'Full 5-signal pipeline — overall 78%', time:'2026-01-16 14:20', actor:'System' },
  { id:'a2', case_id:'CASE-2026-014', action:'Artifact ingested', detail:'Phishing kit archive — SHA256 verified', time:'2026-01-27 18:44', actor:'R. Desai' },
  { id:'a3', case_id:'CASE-2026-021', action:'Wallet cluster expanded', detail:'CLUSTER-A → 3 new addresses', time:'2026-02-04 15:52', actor:'K. Verma' },
  { id:'a4', case_id:'CASE-2026-009', action:'Review requires more evidence', detail:'Stylometry lead — alias handle x0r_99', time:'2026-01-26 10:02', actor:'S. Iyer' },
  { id:'a5', case_id:'CASE-2026-001', action:'OSINT correlation', detail:'shadowbroker alias — 95% correlation', time:'2026-01-10 08:20', actor:'OSINT Engine' },
]
