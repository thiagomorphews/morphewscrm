-- First migration: Add 'entregador' to org_role enum
ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'entregador';