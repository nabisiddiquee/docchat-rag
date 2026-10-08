-- Approximate nearest-neighbour index for cosine distance (pgvector HNSW)
CREATE INDEX IF NOT EXISTS "Chunk_embedding_hnsw_idx" ON "Chunk" USING hnsw ("embedding" vector_cosine_ops);
