# Vector Store Integration & Indexing Strategy

## Indexing Model
- Key: `{workspace_id}/{source}/{doc_id}/{chunk_id}`
- Fields: `text`, `embedding`, `metadata`
  - `metadata`: `workspace_id`, `source`, `title`, `url`, `doc_id`, `chunk_id`, `mime`, `permissions`, `updated_at`, `hash`

## Chunking
- 800–1200 tokens per chunk, 100-token overlap
- Preserve headings in metadata; keep source path for citation

## Embeddings
- Default: OpenAI `text-embedding-3-large`
- On-prem: E5-large-v2; normalize vector; store dimension in index config

## Connectors
- Google Drive: delta by `modifiedTime`; export Google Docs to HTML → text
- Confluence: crawl spaces/pages; observe `version.number`
- Zendesk: help center articles/sections
- FAQs: CSV/Markdown ingestion

## Upsert/Refresh
- Idempotent upsert by `(workspace_id, doc_id, chunk_hash)`
- Triggers: scheduled cron per source, manual reindex, webhook callbacks
- Tombstones: mark deleted docs and purge chunks

## Retrieval
- ANN top-k (k=8–12) + hybrid rerank (BM25 or LLM re-rank)
- Filters: `workspace_id`, `permissions`, `source`
- Output: `[{ text, score, metadata }]` for prompt assembly

## Security & Multi-tenancy
- Enforce `workspace_id` filter at query time
- Permissions in metadata (group/user), checked pre-return
- Pseudonymize PII in stored text when required

## Operations
- Monitoring: index size, QPS, latency p95, fail rate
- Backups: daily snapshots for Milvus; namespace export for Pinecone
- Cost control: TTL old/rarely used embeddings; deduplicate by hash
