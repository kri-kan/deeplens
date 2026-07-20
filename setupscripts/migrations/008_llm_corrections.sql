CREATE TABLE IF NOT EXISTS public.llm_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    source_text TEXT,
    previous_state JSONB NOT NULL,
    new_state JSONB NOT NULL,
    use_for_training BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_llm_corrections_product_id ON public.llm_corrections(product_id);
CREATE INDEX IF NOT EXISTS idx_llm_corrections_use_for_training ON public.llm_corrections(use_for_training);
