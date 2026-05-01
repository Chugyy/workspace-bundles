-- Migration 011: Identified leads cannot be warm — reset to cold
UPDATE leads SET heat_level = 'cold' WHERE status = 'identified' AND heat_level != 'cold';
