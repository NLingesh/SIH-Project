"""Synthetic demo data seeder for DARKTRACE AI.
Creates a coherent investigation story with synthetic actors, aliases, wallets, OSINT etc.
All data is labeled SYNTHETIC / DEMONSTRATION DATA.
"""

import asyncio
import hashlib
import os
import uuid
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

from app.core.config import settings
from app.core.security import hash_password
from app.models import (
    User, Case, Artifact, Evidence, Entity, Alias, Wallet, Transaction,
    TimelineEvent, OSINTRecord, ConfidenceScore, AuditEvent,
    CaseStatus, CasePriority, CaseClassification, ArtifactSourceType,
    EntityType, SignalType, AuditEventType
)

# Use DATABASE_URL from settings; allow override to use sqlite for testing if needed
DATABASE_URL = os.environ.get("DATABASE_URL", settings.database_url)

# Synthetic story
"""
Actor A (shadowbroker) -> alias shadow_broker, sb_operator, owns documents doc1, doc2 with similar writing
  Wallet 0x742d... -> transactions -> cluster 1 -> domain darkweb-market.xyz -> OSINT correlation -> temporal overlap 2026-01-15
Actor B (cryptoking) -> alias crypto_king -> documents doc3 noise
Actor C (netrunner) -> alias net_runner -> infrastructure 192.168.1.100 -> conflicting signal
"""

async def seed():
    # Create engine based on DATABASE_URL (allows sqlite override for testing)
    from app.core.database import Base
    from sqlalchemy.ext.asyncio import create_async_engine
    url = DATABASE_URL
    is_sqlite = url.startswith("sqlite")
    kwargs = {}
    if not is_sqlite:
        kwargs.update(pool_size=5, max_overflow=10)
    local_engine = create_async_engine(url, **kwargs)
    async with local_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(local_engine, expire_on_commit=False) as db:
        # Check existing demo user
        res = await db.execute(select(User).where(User.investigator_id == "INV-DEMO-001"))
        if res.scalar_one_or_none():
            print("Demo data already exists, skipping seed")
            return

        demo_user = User(
            investigator_id="INV-DEMO-001",
            hashed_password=hash_password("demo-passphrase-2026"),
            full_name="Demo Investigator",
            email="demo@darktrace.local",
            clearance_level=3,
            is_active=True,
        )
        db.add(demo_user)
        await db.flush()

        case = Case(
            case_id="CASE-2026-001",
            title="Operation Shadow Broker - Synthetic Demonstration",
            description="SYNTHETIC / DEMONSTRATION DATA: Investigation of pseudonymous actor network with writing similarity, blockchain transactions, OSINT correlations, and technical fingerprints. All findings are investigative leads.",
            investigator_id=demo_user.id,
            authorization_ref="AUTH-2026-SYN-001",
            status=CaseStatus.ACTIVE,
            priority=CasePriority.HIGH,
            classification=CaseClassification.CONFIDENTIAL,
        )
        db.add(case)
        await db.flush()

        # Create a second case for variety
        case2 = Case(
            case_id="CASE-2026-002",
            title="Crypto Exchange Anomaly - Synthetic",
            description="SYNTHETIC / DEMONSTRATION DATA: Secondary case showing noisy/conflicting signals.",
            investigator_id=demo_user.id,
            authorization_ref="AUTH-2026-SYN-002",
            status=CaseStatus.OPEN,
            priority=CasePriority.MEDIUM,
            classification=CaseClassification.UNCLASSIFIED,
        )
        db.add(case2)
        await db.flush()

        # Helper to create artifact with real SHA256
        def make_artifact(case_obj, content: str, source_type, source_ref, mime="text/plain"):
            sha = hashlib.sha256(content.encode()).hexdigest()
            # For demo we don't write file, just store content in artifact_metadata
            art = Artifact(
                artifact_id=f"ART-{uuid.uuid4().hex[:8].upper()}",
                case_id=case_obj.id,
                source_type=source_type,
                source_ref=source_ref,
                sha256=sha,
                raw_location=f"/synthetic/{sha[:8]}",
                normalized_location=f"/synthetic/{sha[:8]}",
                mime_type=mime,
                file_size=len(content.encode()),
                artifact_metadata=content[:2000],
            )
            return art

        # Documents with writing similarity (Actor A)
        doc1_text = """The operational security of this network depends on compartmentalization. Each node must operate independently; failure of one cannot compromise the whole. We have established protocols for key rotation and dead drops. The market infrastructure will remain resilient through distributed architecture."""
        doc2_text = """Operational security depends on compartmentalization of this network. Every node must function independently; the failure of one should not compromise the whole. We have protocols established for key rotation and dead drops. This market infrastructure remains resilient via distributed architecture."""
        doc3_text = """Yo check out this new crypto trading bot! It makes 100x returns guaranteed. Just send 0.5 BTC to this wallet and you'll get rich quick! Limited time offer!!!"""

        art1 = make_artifact(case, doc1_text, ArtifactSourceType.FILE, "doc_shadow_001.txt")
        art2 = make_artifact(case, doc2_text, ArtifactSourceType.FILE, "doc_shadow_002.txt")
        art3 = make_artifact(case, doc3_text, ArtifactSourceType.FILE, "doc_noise_crypto.txt")
        # Additional artifacts for OSINT / infra
        art4 = make_artifact(case, "User shadowbroker registered domain darkweb-market.xyz on 2026-01-10, IP 192.168.1.100, contacted wallet 0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4", ArtifactSourceType.API, "osint_record_001")
        art5 = make_artifact(case, "Wallet 0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4 transferred 2.5 ETH to 0x1234567890123456789012345678901234567890 on 2026-01-15T02:30:00Z", ArtifactSourceType.DATABASE, "tx_record_001")

        db.add_all([art1, art2, art3, art4, art5])
        await db.flush()

        # Entities - 4 actors/aliases
        ent_actor_a = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.ACTOR, canonical_label="ShadowBroker (suspected actor)", confidence=78, is_synthetic=True)
        ent_alias1 = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.ALIAS, canonical_label="shadowbroker", confidence=85, is_synthetic=True)
        ent_alias2 = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.ALIAS, canonical_label="shadow_broker", confidence=82, is_synthetic=True)
        ent_doc1 = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.DOCUMENT, canonical_label="doc_shadow_001.txt", confidence=90, is_synthetic=True)
        ent_doc2 = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.DOCUMENT, canonical_label="doc_shadow_002.txt", confidence=90, is_synthetic=True)
        ent_wallet = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.WALLET, canonical_label="0x742d35Cc6634C0532925a3b8D4C053", confidence=75, is_synthetic=True)
        ent_domain = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.DOMAIN, canonical_label="darkweb-market.xyz", confidence=80, is_synthetic=True)
        ent_ip = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.IP, canonical_label="192.168.1.100", confidence=60, is_synthetic=True)
        # Noisy actor B
        ent_actor_b = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.ACTOR, canonical_label="CryptoKing (noisy unrelated)", confidence=35, is_synthetic=True)
        ent_alias_b = Entity(entity_id=f"ENT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, type=EntityType.ALIAS, canonical_label="cryptoking", confidence=88, is_synthetic=True)

        db.add_all([ent_actor_a, ent_alias1, ent_alias2, ent_doc1, ent_doc2, ent_wallet, ent_domain, ent_ip, ent_actor_b, ent_alias_b])
        await db.flush()

        # Aliases
        alias1 = Alias(alias_id=f"ALS-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_alias1.id, value="shadowbroker", source="synthetic_osint", confidence=90, is_synthetic=True)
        alias2 = Alias(alias_id=f"ALS-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_alias1.id, value="shadow_broker", source="synthetic_osint", confidence=85, is_synthetic=True)
        alias3 = Alias(alias_id=f"ALS-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_alias1.id, value="sb_operator", source="synthetic_osint", confidence=80, is_synthetic=True)
        alias4 = Alias(alias_id=f"ALS-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_alias_b.id, value="cryptoking", source="synthetic_osint", confidence=88, is_synthetic=True)
        db.add_all([alias1, alias2, alias3, alias4])
        await db.flush()

        # Evidence records
        ev1 = Evidence(evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_actor_a.id, artifact_id=art1.id, signal_type=SignalType.STYLOMETRY, feature="vocabulary_richness", score=84, explanation="SYNTHETIC: Potential writing-style similarity between doc_shadow_001.txt and doc_shadow_002.txt. Vocabulary richness overlap 0.84. Investigative lead – requires analyst verification.", confidence=82, is_synthetic=True)
        ev2 = Evidence(evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_actor_a.id, artifact_id=art2.id, signal_type=SignalType.STYLOMETRY, feature="punctuation_distribution", score=79, explanation="SYNTHETIC: Punctuation distribution correlation 0.79. Baseline model, not definitive.", confidence=70, is_synthetic=True)
        ev3 = Evidence(evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_wallet.id, artifact_id=art5.id, signal_type=SignalType.BLOCKCHAIN, feature="wallet_cluster_cooccurrence", score=88, explanation="SYNTHETIC: Wallet 0x742d... co-occurs with domain registration in same temporal window.", confidence=75, is_synthetic=True)
        ev4 = Evidence(evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_domain.id, artifact_id=art4.id, signal_type=SignalType.OSINT, feature="alias_reuse", score=91, explanation="SYNTHETIC: OSINT correlation exact match for shadowbroker alias across 2 sources.", confidence=85, is_synthetic=True)
        ev5 = Evidence(evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_ip.id, artifact_id=art4.id, signal_type=SignalType.TECHNICAL_FINGERPRINT, feature="infrastructure_overlap", score=76, explanation="SYNTHETIC: IP 192.168.1.100 appears in two artifacts (infrastructure fingerprint). May be VPN – not definitive.", confidence=62, is_synthetic=True)
        ev6 = Evidence(evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_actor_a.id, artifact_id=art1.id, signal_type=SignalType.TEMPORAL, feature="temporal_overlap", score=81, explanation="SYNTHETIC: Artifacts art_shadow_001 and tx_record_001 within 48h window (2026-01-13 to 2026-01-15).", confidence=78, is_synthetic=True)
        # Conflicting noisy evidence (low score, contradicting)
        ev7 = Evidence(evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_actor_b.id, artifact_id=art3.id, signal_type=SignalType.STYLOMETRY, feature="writing_style_divergence", score=22, explanation="SYNTHETIC: Noise document shows low similarity (22) – conflicting signal demonstrates uncertainty.", confidence=40, is_synthetic=True)
        ev8 = Evidence(evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}", entity_id=ent_actor_b.id, artifact_id=art3.id, signal_type=SignalType.BLOCKCHAIN, feature="wallet_no_link", score=30, explanation="SYNTHETIC: CryptoKing wallet shows no transaction link to ShadowBroker cluster.", confidence=45, is_synthetic=True)

        db.add_all([ev1, ev2, ev3, ev4, ev5, ev6, ev7, ev8])
        await db.flush()

        # Wallets + transactions
        wallet1 = Wallet(wallet_id=f"WAL-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, address="0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4", blockchain="ethereum", label="shadowbroker_primary", cluster_id="CLUSTER-A", risk_score=72, is_synthetic=True)
        wallet2 = Wallet(wallet_id=f"WAL-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, address="0x1234567890123456789012345678901234567890", blockchain="ethereum", label="shadowbroker_counterparty", cluster_id="CLUSTER-A", risk_score=65, is_synthetic=True)
        wallet3 = Wallet(wallet_id=f"WAL-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", blockchain="bitcoin", label="cryptoking_noise", cluster_id="CLUSTER-B", risk_score=40, is_synthetic=True)
        db.add_all([wallet1, wallet2, wallet3])
        await db.flush()

        tx1 = Transaction(transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}", wallet_id=wallet1.id, tx_hash="0xaaaa111122223333444455556666777788889999", from_address=wallet1.address, to_address=wallet2.address, value="2.5", token="ETH", timestamp=datetime(2026, 1, 15, 2, 30, 0), block_number=19200000, is_synthetic=True)
        tx2 = Transaction(transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}", wallet_id=wallet1.id, tx_hash="0xbbbb222233334444555566667777888899990000", from_address=wallet1.address, to_address="0x9999999999999999999999999999999999999999", value="0.8", token="ETH", timestamp=datetime(2026, 1, 14, 22, 15, 0), block_number=19199000, is_synthetic=True)
        tx3 = Transaction(transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}", wallet_id=wallet2.id, tx_hash="0xcccc333344445555666677778888999900001111", from_address=wallet2.address, to_address=wallet1.address, value="1.2", token="ETH", timestamp=datetime(2026, 1, 16, 4, 0, 0), block_number=19201000, is_synthetic=True)
        tx4 = Transaction(transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}", wallet_id=wallet3.id, tx_hash="bc1_noise_tx_001", from_address=wallet3.address, to_address="bc1q_other_address_123", value="0.05", token="BTC", timestamp=datetime(2026, 1, 12, 12, 0, 0), block_number=830000, is_synthetic=True)
        db.add_all([tx1, tx2, tx3, tx4])
        await db.flush()

        # OSINT records
        osint1 = OSINTRecord(record_id=f"OSINT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, source="synthetic_alias_database", identifier="shadowbroker", identifier_type="alias", match_type="exact", correlation_score=95, confidence=88, evidence_reference=ev4.evidence_id, timestamp=datetime(2026, 1, 10, 8, 0, 0), is_synthetic=True, raw_data="SYNTHETIC: shadowbroker found in forum posts")
        osint2 = OSINTRecord(record_id=f"OSINT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, source="synthetic_domain_database", identifier="darkweb-market.xyz", identifier_type="domain", match_type="exact", correlation_score=90, confidence=85, evidence_reference=ev4.evidence_id, timestamp=datetime(2026, 1, 10, 9, 0, 0), is_synthetic=True, raw_data="SYNTHETIC: domain linked to shadowbroker")
        osint3 = OSINTRecord(record_id=f"OSINT-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, source="synthetic_wallet_database", identifier="0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4", identifier_type="wallet", match_type="exact", correlation_score=92, confidence=80, evidence_reference=ev3.evidence_id, timestamp=datetime(2026, 1, 15, 2, 35, 0), is_synthetic=True, raw_data="SYNTHETIC: wallet correlated to shadowbroker cluster")
        db.add_all([osint1, osint2, osint3])
        await db.flush()

        # Timeline events (chronological)
        base_time = datetime(2026, 1, 10, 8, 0, 0)
        events = [
            TimelineEvent(event_id=f"TL-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, entity_id=ent_domain.id, timestamp=base_time, event_type="domain_registered", title="Domain registered: darkweb-market.xyz", description="SYNTHETIC: Domain darkweb-market.xyz registered by shadowbroker alias", source="synthetic_osint", evidence_ids=ev4.evidence_id, entity_ids=ent_domain.entity_id, is_synthetic=True),
            TimelineEvent(event_id=f"TL-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, entity_id=ent_doc1.id, timestamp=base_time + timedelta(days=2), event_type="document_created", title="Document created: doc_shadow_001.txt", description="SYNTHETIC: First shadowbroker document created", source="artifact_ingestion", evidence_ids=ev1.evidence_id, entity_ids=ent_doc1.entity_id, is_synthetic=True),
            TimelineEvent(event_id=f"TL-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, entity_id=ent_doc2.id, timestamp=base_time + timedelta(days=3, hours=5), event_type="document_created", title="Document created: doc_shadow_002.txt", description="SYNTHETIC: Second document with similar writing style", source="artifact_ingestion", evidence_ids=ev2.evidence_id, entity_ids=ent_doc2.entity_id, is_synthetic=True),
            TimelineEvent(event_id=f"TL-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, entity_id=ent_wallet.id, timestamp=datetime(2026, 1, 15, 2, 30, 0), event_type="wallet_transaction", title="ETH transfer 2.5 ETH", description="SYNTHETIC: Wallet 0x742d... -> 0x1234... 2.5 ETH", source="synthetic_blockchain", evidence_ids=ev3.evidence_id, entity_ids=ent_wallet.entity_id, is_synthetic=True),
            TimelineEvent(event_id=f"TL-{uuid.uuid4().hex[:8].upper()}", case_id=case.id, entity_id=ent_ip.id, timestamp=base_time + timedelta(days=5), event_type="infrastructure_observed", title="IP observed: 192.168.1.100", description="SYNTHETIC: Infrastructure identifier reused", source="technical_fingerprint", evidence_ids=ev5.evidence_id, entity_ids=ent_ip.entity_id, is_synthetic=True),
        ]
        db.add_all(events)
        await db.flush()

        # Confidence score
        conf = ConfidenceScore(
            score_id=f"CONF-{uuid.uuid4().hex[:8].upper()}",
            case_id=case.id,
            overall_confidence=78,
            stylometry_score=84,
            blockchain_score=79,
            osint_score=91,
            technical_fingerprint_score=76,
            temporal_score=81,
            evidence_count=8,
            explanation="SYNTHETIC: Overall 78% – OSINT strongest (91), stylometry 84, temporal 81. Conflicting noise evidence (22,30) lowers confidence by 7 points. Multiple independent signals support lead but not definitive identification. Requires analyst verification.",
            uncertainty_factors="SYNTHETIC demo baseline models; noisy/conflicting CryptoKing signals; VPN obfuscation possible; small document sample",
            model_version="1.0.0",
            is_synthetic=True,
        )
        db.add(conf)
        await db.flush()

        # Audit events
        for evt in [AuditEventType.CASE_CREATED, AuditEventType.ARTIFACT_ADDED, AuditEventType.ANALYSIS_COMPLETED]:
            db.add(AuditEvent(
                event_id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
                case_id=case.id,
                user_id=demo_user.id,
                event_type=evt,
                description=f"SYNTHETIC: {evt.value} for {case.case_id}",
                event_metadata="SYNTHETIC DEMONSTRATION DATA",
                ip_address="127.0.0.1",
                user_agent="seed_script",
            ))
        await db.commit()
        print(f"Seeded demo case {case.case_id} with {len(events)} timeline events, 8 evidence, 3 wallets, 3 OSINT records")

        # Try to seed Neo4j if available
        try:
            from app.adapters.neo4j_adapter import neo4j_adapter
            await neo4j_adapter.connect()
            if neo4j_adapter.is_available:
                await neo4j_adapter.execute_write("MERGE (c:Case {case_id: $cid})", {"cid": case.case_id})
                for ent in [ent_actor_a, ent_alias1, ent_wallet, ent_domain]:
                    await neo4j_adapter.execute_write(
                        "MERGE (e:Entity {entity_id: $eid}) SET e.label=$label, e.type=$type, e.case_id=$cid",
                        {"eid": ent.entity_id, "label": ent.canonical_label, "type": ent.type.value, "cid": case.case_id}
                    )
                # relationships
                await neo4j_adapter.execute_write(
                    "MATCH (a:Entity {entity_id: $a}), (b:Entity {entity_id: $b}) MERGE (a)-[r:ALIAS_REUSE {confidence: 85}]->(b)",
                    {"a": ent_alias1.entity_id, "b": ent_alias2.entity_id}
                )
                await neo4j_adapter.execute_write(
                    "MATCH (a:Entity {entity_id: $a}), (b:Entity {entity_id: $b}) MERGE (a)-[r:WRITING_SIMILARITY {confidence: 84}]->(b)",
                    {"a": ent_doc1.entity_id, "b": ent_doc2.entity_id}
                )
                await neo4j_adapter.execute_write(
                    "MATCH (a:Entity {entity_id: $a}), (b:Entity {entity_id: $b}) MERGE (a)-[r:WALLET_TRANSACTION {confidence: 79}]->(b)",
                    {"a": ent_wallet.entity_id, "b": ent_domain.entity_id}
                )
                print("Neo4j demo graph seeded")
        except Exception as e:
            print(f"Neo4j seed skipped: {e}")

if __name__ == "__main__":
    asyncio.run(seed())
