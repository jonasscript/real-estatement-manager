-- Cleanup business data for properties, purchases, payment schedules and payments.
--
-- Preserved:
--   users, roles, sellers, clients, real_estates,
--   menu_options, role_menu_options, components, actions, permissions, role_permissions.
--
-- Deleted:
--   property inventory, purchases, commercial stages instantiated per purchase,
--   payment schedules, installments, payments, abonos, payment email logs and notifications.
--
-- Run manually:
--   psql -d <DB_NAME> -f backend/src/models/cleanup_property_payment_data.sql
--
-- Note:
--   This script intentionally does not use RESTART IDENTITY. In PostgreSQL,
--   resetting SERIAL/IDENTITY sequences requires ownership of each sequence,
--   and many existing databases are operated by a user that can truncate tables
--   but does not own sequences such as abonos_id_seq.

-- If a previous run failed inside a transaction, PostgreSQL leaves the session
-- in "current transaction is aborted" state. ROLLBACK is harmless when there is
-- no active transaction and clears that state when there is one.
ROLLBACK;

-- These tables are all business/transactional data. The block truncates only
-- tables that exist, so it also works on databases that have not received every
-- newer migration yet.
DO $$
DECLARE
  relation_list TEXT;
BEGIN
  SELECT string_agg(format('public.%I', table_name), ', ')
  INTO relation_list
  FROM unnest(ARRAY[
    'payment_email_logs',
    'notifications',
    'payments',
    'abonos',
    'installments',
    'payment_schedules',
    'client_purchase_stages',
    'property_stage_overrides',
    'property_purchases',
    'properties',
    'units',
    'blocks',
    'phases',
    'property_models'
  ]) AS t(table_name)
  WHERE to_regclass(format('public.%I', table_name)) IS NOT NULL;

  IF relation_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || relation_list || ' CASCADE';
  END IF;
END $$;

-- Keep property catalogs by default so the app still has base options available:
--   property_types, property_status, phase_types, purchase_stage_definitions.
--
-- If you also want to delete property catalog/configuration data, uncomment this block.
-- WARNING: This removes configurable commercial stage definitions and property catalogs.
--
-- DO $$
-- DECLARE
--   relation_list TEXT;
-- BEGIN
--   SELECT string_agg(format('public.%I', table_name), ', ')
--   INTO relation_list
--   FROM unnest(ARRAY[
--     'purchase_stage_definitions',
--     'property_types',
--     'property_status',
--     'phase_types'
--   ]) AS t(table_name)
--   WHERE to_regclass(format('public.%I', table_name)) IS NOT NULL;
--
--   IF relation_list IS NOT NULL THEN
--     EXECUTE 'TRUNCATE TABLE ' || relation_list || ' CASCADE';
--   END IF;
-- END $$;
