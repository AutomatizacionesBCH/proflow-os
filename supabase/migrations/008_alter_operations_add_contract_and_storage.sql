-- Add contract_url to operations
ALTER TABLE public.operations ADD COLUMN IF NOT EXISTS contract_url TEXT;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('contratos',               'contratos',               true),
  ('documentos-clientes',     'documentos-clientes',     true),
  ('documentos-operaciones',  'documentos-operaciones',  true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage buckets
DROP POLICY IF EXISTS "Public access contratos"              ON storage.objects;
DROP POLICY IF EXISTS "Public access documentos-clientes"   ON storage.objects;
DROP POLICY IF EXISTS "Public access documentos-operaciones" ON storage.objects;

CREATE POLICY "Public access contratos"
  ON storage.objects FOR ALL TO public
  USING (bucket_id = 'contratos')
  WITH CHECK (bucket_id = 'contratos');

CREATE POLICY "Public access documentos-clientes"
  ON storage.objects FOR ALL TO public
  USING (bucket_id = 'documentos-clientes')
  WITH CHECK (bucket_id = 'documentos-clientes');

CREATE POLICY "Public access documentos-operaciones"
  ON storage.objects FOR ALL TO public
  USING (bucket_id = 'documentos-operaciones')
  WITH CHECK (bucket_id = 'documentos-operaciones');
