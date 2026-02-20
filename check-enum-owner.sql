SELECT t.typname, r.rolname as owner
FROM pg_type t
JOIN pg_roles r ON t.typowner = r.oid
WHERE t.typname = 'pay_intents_status_enum';
