-- Adicionar política RLS para admin poder atualizar qualquer evento
-- Execute no SQL Editor do Supabase Dashboard

-- Verificar se existe política de update para admins
DROP POLICY IF EXISTS "Admins can update any event" ON events;

CREATE POLICY "Admins can update any event" ON events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Verificar se existe política de insert para admins  
DROP POLICY IF EXISTS "Admins can insert any event" ON events;

CREATE POLICY "Admins can insert any event" ON events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Verificar e criar política de delete para admins
DROP POLICY IF EXISTS "Admins can delete any event" ON events;

CREATE POLICY "Admins can delete any event" ON events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Confirmar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'events';
