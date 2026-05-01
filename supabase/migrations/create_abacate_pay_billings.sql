-- Tabela de cobranças da Abacate Pay
CREATE TABLE IF NOT EXISTS public.abacate_pay_billings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    billing_id VARCHAR NOT NULL,
    amount NUMERIC NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR,
    checkout_url TEXT,
    customer_name VARCHAR,
    customer_email VARCHAR,
    customer_cpf VARCHAR,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.abacate_pay_billings ENABLE ROW LEVEL SECURITY;

-- Política de leitura (Service role ignora RLS, admin vê tudo)
CREATE POLICY "Admin pode ler abacate billings" ON public.abacate_pay_billings
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Não precisamos de policies de insert/update pq o service role (backend) bypassa RLS.
