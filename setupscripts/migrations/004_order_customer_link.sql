-- Add customer_id to orderId table
ALTER TABLE "orderId" ADD COLUMN customer_id uuid REFERENCES "customers"(id);
