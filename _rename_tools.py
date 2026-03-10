#!/usr/bin/env python3
"""Rename all 23 tool display names in prod-app/src/index.html.
Only changes display text — no IDs, onclick handlers, or logic."""

FILE = "prod-app/src/index.html"

with open(FILE, "r") as f:
    html = f.read()

# Order matters: longest/most-specific first to avoid partial matches
renames = [
    # Panel h3 headings (most specific — do these FIRST)
    ("ILS Gap Analysis", "Gap Finder"),
    ("DMSMS / Obsolescence Tracker", "Obsolescence Alert"),
    ("Operational Readiness Calculator", "Readiness Score"),
    ("AI Supply Chain Risk Engine", "Risk Radar"),
    ("Predictive Maintenance AI", "Maintenance Predictor"),
    ("Automated Audit Report Generator", "Audit Builder"),
    ("Defense Document Library", "Report Vault"),
    ("Software Bill of Materials (SBOM)", "SBOM Scanner"),
    ("S4 Ledger ROI Calculator", "ROI Calculator"),
    ("Program Milestone Tracker", "Milestone Monitor"),
    ("Lifecycle Cost Estimator", "Lifecycle Cost Estimator"),  # already correct
    ("Team & Access Management", "Team Coordinator"),
    ("Program Brief Engine", "Brief Composer"),
    # Hub tab / card names (medium specificity)
    ("Obsolescence Check", "Obsolescence Alert"),
    ("DMSMS Tracker", "Obsolescence Alert"),
    ("Readiness Calculator", "Readiness Score"),
    ("Supply Chain Risk", "Risk Radar"),
    ("Predictive Maintenance", "Maintenance Predictor"),
    ("Report Generator", "Audit Builder"),
    ("Cross-Program Analytics", "Program Overview"),
    ("Program Milestones", "Milestone Monitor"),
    ("Acquisition Planner", "Fleet Optimizer"),
    # Card titles + remaining hub tabs
    ("Gap Analysis", "Gap Finder"),
    ("Action Items", "Task Prioritizer"),
    ("Audit Vault", "Doc Vault"),
    ("Document Library", "Report Vault"),
    ("Submissions &amp; PTD", "Submissions Hub"),
    ("Submissions & PTD", "Submissions Hub"),
    ("CDRL Validator", "Deliverables Tracker"),
    ("Contract Extractor", "Contract Analyzer"),
    ("SBOM Viewer", "SBOM Scanner"),
    ("GFP Tracker", "Property Custodian"),
    ("Provenance Chain", "Chain of Custody"),
    ("Lifecycle Cost", "Lifecycle Cost Estimator"),
    ("Team Management", "Team Coordinator"),
]

total = 0
for old, new in renames:
    if old == new:
        continue
    n = html.count(old)
    if n > 0:
        html = html.replace(old, new)
        total += n
        print(f"  {old:45s} -> {new:25s} ({n}x)")

with open(FILE, "w") as f:
    f.write(html)

print(f"\nDone: {total} total replacements in {FILE}")
