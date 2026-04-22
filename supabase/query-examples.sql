-- Helper similarity search query for manual debugging.
select
  kc.id,
  kd.title,
  kd.category,
  kc.chunk_text,
  1 - (kc.embedding <=> '[0.1, 0.2, 0.3]'::vector) as similarity
from public.knowledge_chunks kc
join public.knowledge_documents kd on kd.id = kc.document_id
order by kc.embedding <=> '[0.1, 0.2, 0.3]'::vector
limit 5;

-- Recommended RPC call from n8n via Supabase REST:
-- POST /rest/v1/rpc/match_knowledge_chunks
-- {
--   "query_embedding": [0.1, 0.2, 0.3],
--   "match_count": 5,
--   "category_filter": null
-- }
