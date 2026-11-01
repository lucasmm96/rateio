CREATE OR REPLACE FUNCTION buscar_usuarios_por_prefixo_email(p_prefixo TEXT)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, email FROM users
  WHERE LOWER(email) LIKE LOWER(p_prefixo) || '%'
  ORDER BY email
  LIMIT 10;
$$;
