from neo4j import AsyncGraphDatabase, AsyncDriver, AsyncSession
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, List, Dict, Any
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class Neo4jAdapter:
    def __init__(self):
        self._driver: Optional[AsyncDriver] = None
        self._available = False

    async def connect(self) -> bool:
        try:
            self._driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username, settings.neo4j_password),
            )
            await self._driver.verify_connectivity()
            self._available = True
            logger.info("Neo4j connection established")
            # best-effort constraints/indexes
            try:
                await self.ensure_constraints()
            except Exception as e:
                logger.warning(f"Neo4j ensure_constraints failed: {e}")
            return True
        except Exception as e:
            logger.warning(f"Neo4j connection failed: {e}. Running without Neo4j.")
            self._available = False
            return False

    async def ensure_constraints(self) -> None:
        if not self._available or not self._driver:
            return
        stmts = [
            "CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.entity_id IS UNIQUE",
            "CREATE CONSTRAINT wallet_id_unique IF NOT EXISTS FOR (w:Wallet) REQUIRE w.wallet_id IS UNIQUE",
            "CREATE CONSTRAINT case_id_unique IF NOT EXISTS FOR (c:Case) REQUIRE c.case_id IS UNIQUE",
            "CREATE INDEX entity_case IF NOT EXISTS FOR (e:Entity) ON (e.case_id)",
            "CREATE INDEX wallet_case IF NOT EXISTS FOR (w:Wallet) ON (w.case_id)",
            "CREATE INDEX rel_confidence IF NOT EXISTS FOR ()-[r:REL]-() ON (r.confidence)",
        ]
        for stmt in stmts:
            try:
                await self.execute_write(stmt)
            except Exception as e:
                logger.debug(f"Neo4j constraint stmt failed ({stmt[:40]}): {e}")

    async def close(self) -> None:
        if self._driver:
            await self._driver.close()
            self._driver = None
            self._available = False

    @property
    def is_available(self) -> bool:
        return self._available

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        if not self._driver or not self._available:
            raise RuntimeError("Neo4j not available")
        async with self._driver.session() as session:
            yield session

    async def execute_query(self, query: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        if not self._available:
            return []
        async with self.session() as session:
            result = await session.run(query, params or {})
            return [record.data() for record in result]

    async def execute_write(self, query: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        if not self._available:
            return {}
        async with self.session() as session:
            result = await session.run(query, params or {})
            summary = await result.consume()
            return {"counters": summary.counters.__dict__}


neo4j_adapter = Neo4jAdapter()