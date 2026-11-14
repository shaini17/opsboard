-- OpsBoard integration migration
-- Additive changes: existing records are preserved.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Cloud Operations';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT
'{
  "emailAlerts": true,
  "incidentAlerts": true,
  "deploymentAlerts": true,
  "maintenanceAlerts": false,
  "weeklyReport": true
}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_maintenance_status
ON maintenance_windows(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_users_active
ON users(is_active);

