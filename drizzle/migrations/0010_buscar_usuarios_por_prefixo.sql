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
