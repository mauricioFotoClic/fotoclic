-- ==============================================================================
-- 🛠️ FOTOCLIC: CORREÇÃO DA TRIGGER DE ANTI-ESCALAÇÃO DE ROLE (ENUM user_role)
-- ==============================================================================
-- Descrição:
-- Corrige a incompatibilidade entre o tipo ENUM 'user_role' e a função trim() (pg_catalog.btrim),
-- adicionando o cast explícito (NEW.role::text).
-- Mantém 100% da segurança contra auto-promoção para 'admin' ativa e sem brechas.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prevent_admin_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_caller_admin boolean;
BEGIN
    -- Checa se quem está executando a operação já é um administrador confirmado
    is_caller_admin := public.is_admin();

    -- NO INSERT (Novo cadastro):
    IF TG_OP = 'INSERT' THEN
        -- Se um usuário comum tentar enviar 'admin', força para 'customer'
        IF NEW.role::text = 'admin' AND NOT is_caller_admin THEN
            NEW.role := 'customer';
        END IF;

        -- Garante que o role nunca seja nulo ou vazio (com cast seguro ::text)
        IF NEW.role IS NULL OR trim(NEW.role::text) = '' THEN
            NEW.role := 'customer';
        END IF;

        RETURN NEW;
    END IF;

    -- NO UPDATE (Edição de perfil):
    IF TG_OP = 'UPDATE' THEN
        -- Se o papel foi alterado para 'admin' ou modificado sem ser admin, bloqueia
        IF (NEW.role::text <> OLD.role::text) AND NOT is_caller_admin THEN
            -- Mantém o papel original intacto
            NEW.role := OLD.role;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- Recria o trigger para garantir o vínculo correto
DROP TRIGGER IF EXISTS trg_prevent_admin_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_admin_role_escalation
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_role_escalation();
