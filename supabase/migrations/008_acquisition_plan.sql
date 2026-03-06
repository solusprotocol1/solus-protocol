-- ─────────────────────────────────────────────────────────────────────
--  ACQUISITION_PLAN — 30+ Year Service Craft/Vessel Acquisition Tracker
--  Phase 1 of Acquisition Planner tool suite
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS acquisition_plan (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id              TEXT NOT NULL DEFAULT '',
    user_email          TEXT NOT NULL DEFAULT '',
    hull_type           TEXT NOT NULL DEFAULT '',
    hull_number         TEXT NOT NULL DEFAULT '',
    action_need         TEXT DEFAULT '',
    requestor           TEXT DEFAULT '',
    date_requested      DATE,
    needed_completion   DATE,
    lifecycle_years     INTEGER,
    justification       TEXT DEFAULT '',
    pom_funded          TEXT DEFAULT '',
    navy_region         TEXT DEFAULT '',
    custodian_activity  TEXT DEFAULT '',
    resource_sponsor    TEXT DEFAULT '',
    sponsor_contact     TEXT DEFAULT '',
    ship_builder        TEXT DEFAULT '',
    last_roh_cost_k     NUMERIC(12,2),
    est_next_fy_cost_k  NUMERIC(12,2),
    total_cost_k        NUMERIC(12,2),
    craft_age_years     INTEGER,
    last_roh            DATE,
    planned_roh         DATE,
    planned_mi          DATE,
    material_condition  TEXT DEFAULT '',
    last_dry_dock       DATE,
    metadata            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acq_org ON acquisition_plan (org_id);
CREATE INDEX IF NOT EXISTS idx_acq_hull ON acquisition_plan (hull_type, hull_number);
CREATE INDEX IF NOT EXISTS idx_acq_need ON acquisition_plan (action_need);
CREATE INDEX IF NOT EXISTS idx_acq_funded ON acquisition_plan (pom_funded);
CREATE INDEX IF NOT EXISTS idx_acq_condition ON acquisition_plan (material_condition);

ALTER TABLE acquisition_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON acquisition_plan FOR ALL USING (true);
