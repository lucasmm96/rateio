ALTER TABLE "users" ADD COLUMN "nome" text;

-- RPC: usuário atualiza seu próprio nome (RLS garante que só atualiza a si mesmo)
CREATE OR REPLACE FUNCTION atualizar_nome_usuario(p_nome TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE users SET nome = p_nome WHERE id = auth.uid();
$$;

-- Atualiza busca de usuários para incluir nome além do email
DROP FUNCTION IF EXISTS buscar_usuarios_por_prefixo_email(TEXT);
CREATE FUNCTION buscar_usuarios_por_prefixo_email(p_prefixo TEXT)
RETURNS TABLE(id UUID, email TEXT, nome TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, email, nome FROM users
  WHERE LOWER(email) LIKE LOWER(p_prefixo) || '%'
     OR (nome IS NOT NULL AND LOWER(nome) LIKE LOWER(p_prefixo) || '%')
  ORDER BY email
  LIMIT 10;
$$;