// ═══════════════════════════════════════════════════════════════════════
//  S4 Ledger — Acquisition Planner Tool
//  30+ Year Service Craft/Vessel Acquisition Lifecycle Tracker
//  Phase 1: Full CRUD grid, filtering, sorting, XLSX/CSV export,
//           Supabase persistence, XRPL hash anchoring
// ═══════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── Column Definitions ──────────────────────────────────────────
    var ACQ_COLUMNS = [
        { key: 'hull_type',           label: 'Hull Type',            type: 'text',     width: '110px', required: true },
        { key: 'hull_number',         label: 'Hull #',               type: 'text',     width: '80px',  required: true },
        { key: 'action_need',         label: 'Need',                 type: 'select',   width: '120px', options: ['Replacement','Disposal/Disposition','Addition/New Build','Service Life Extension','Transfer'] },
        { key: 'requestor',           label: 'Requestor',            type: 'text',     width: '130px' },
        { key: 'date_requested',      label: 'Date Requested',       type: 'date',     width: '120px' },
        { key: 'needed_completion',    label: 'Needed By',            type: 'date',     width: '120px' },
        { key: 'lifecycle_years',      label: 'Lifecycle (Yrs)',      type: 'number',   width: '90px' },
        { key: 'justification',       label: 'Justification',        type: 'textarea', width: '220px' },
        { key: 'pom_funded',          label: 'POM Funded',           type: 'select',   width: '100px', options: ['Yes','No','Partial','Pending'] },
        { key: 'navy_region',         label: 'Navy Region',          type: 'text',     width: '110px' },
        { key: 'custodian_activity',   label: 'Custodian Activity',   type: 'text',     width: '130px' },
        { key: 'resource_sponsor',     label: 'Resource Sponsor',     type: 'text',     width: '130px' },
        { key: 'sponsor_contact',      label: 'Sponsor Contact',      type: 'text',     width: '150px' },
        { key: 'ship_builder',         label: 'Ship Builder',         type: 'text',     width: '130px' },
        { key: 'last_roh_cost_k',      label: 'Last ROH ($K)',        type: 'number',   width: '100px' },
        { key: 'est_next_fy_cost_k',   label: 'Est Next FY ($K)',     type: 'number',   width: '110px' },
        { key: 'total_cost_k',         label: 'Total Cost ($K)',      type: 'number',   width: '100px' },
        { key: 'craft_age_years',      label: 'Age (Yrs)',            type: 'number',   width: '80px' },
        { key: 'last_roh',             label: 'Last ROH',             type: 'date',     width: '110px' },
        { key: 'planned_roh',          label: 'Planned ROH',          type: 'date',     width: '110px' },
        { key: 'planned_mi',           label: 'Planned MI',           type: 'date',     width: '110px' },
        { key: 'material_condition',   label: 'Material Condition',   type: 'select',   width: '120px', options: ['Excellent','Good','Fair','Poor','Critical'] },
        { key: 'last_dry_dock',        label: 'Last Dry Dock',        type: 'date',     width: '110px' }
    ];

    // ── State ───────────────────────────────────────────────────────
    var _acqData = [];
    var _acqSortCol = null;
    var _acqSortDir = 'asc';
    var _acqFilterText = '';
    var _acqEditingId = null;
    var _acqNextLocalId = 1;
    var _acqCurrentProgram = 'all';
    var _acqPrograms = ['All Programs'];

    // ── Public: Initialize / Render ────────────────────────────────
    function initAcquisitionPlanner() {
        _loadAcqData(function () {
            _rebuildProgramList();
            _renderAcqGrid();
            _updateAcqStats();
        });
    }
    window.initAcquisitionPlanner = initAcquisitionPlanner;

    // ── Data Loading (Supabase → local) ─────────────────────────────
    function _loadAcqData(cb) {
        if (window._sbClient) {
            window._sbClient.from('acquisition_plan').select('*').order('created_at', { ascending: true }).then(function (res) {
                if (res.data && res.data.length) {
                    _acqData = res.data.map(function (r) { r._persisted = true; return r; });
                    _acqNextLocalId = _acqData.length + 1;
                } else if (!_acqData.length) {
                    _seedDemoData();
                }
                if (cb) cb();
            }).catch(function () {
                if (!_acqData.length) _seedDemoData();
                if (cb) cb();
            });
        } else {
            if (!_acqData.length) _seedDemoData();
            if (cb) cb();
        }
    }

    // ── Demo Seed Data (used when Supabase empty / offline) ─────────
    function _seedDemoData() {
        // Only seed if demo mode or no data
        if (!sessionStorage.getItem('s4_demo_mode') && _acqData.length) return;
        _acqData = _getDemoRecords();
        _acqNextLocalId = _acqData.length + 1;
    }

    function _getDemoRecords() {
        return [
            { _localId: 1, hull_type: 'YP', hull_number: 'YP-703', action_need: 'Replacement', requestor: 'NSWC Panama City', date_requested: '2019-03-15', needed_completion: '2028-09-30', lifecycle_years: 30, justification: 'Hull has exceeded operational service life. Structural fatigue and corrosion identified during last ROH. Replacement needed to maintain training capability at USNA and support fleet readiness pipeline.', pom_funded: 'Yes', navy_region: 'CNRMA', custodian_activity: 'USNA', resource_sponsor: 'OPNAV N97', sponsor_contact: 'CDR J. Williams, (703) 555-0142', ship_builder: 'Marinette Marine', last_roh_cost_k: 2850, est_next_fy_cost_k: 0, total_cost_k: 45000, craft_age_years: 35, last_roh: '2021-06-15', planned_roh: '', planned_mi: '', material_condition: 'Poor', last_dry_dock: '2021-06-15' },
            { _localId: 2, hull_type: 'YP', hull_number: 'YP-705', action_need: 'Service Life Extension', requestor: 'USNA', date_requested: '2021-07-01', needed_completion: '2030-06-30', lifecycle_years: 30, justification: 'Mid-life modernization required. Propulsion system upgrade and navigation suite replacement. Current material condition supports extension with targeted ROH investment.', pom_funded: 'Partial', navy_region: 'CNRMA', custodian_activity: 'USNA', resource_sponsor: 'OPNAV N97', sponsor_contact: 'CDR J. Williams, (703) 555-0142', ship_builder: '', last_roh_cost_k: 1950, est_next_fy_cost_k: 3200, total_cost_k: 5150, craft_age_years: 22, last_roh: '2023-01-10', planned_roh: '2027-04-01', planned_mi: '2025-11-01', material_condition: 'Fair', last_dry_dock: '2023-01-10' },
            { _localId: 3, hull_type: '120 WLB', hull_number: 'USCGC Fir (WLB-213)', action_need: 'Disposal/Disposition', requestor: 'SFLC', date_requested: '2020-11-22', needed_completion: '2026-12-31', lifecycle_years: 40, justification: 'Vessel has reached end of operational service life. Replacement delivered under NSC program. Disposition through DRMS following hull stripping of reusable components. HAZMAT remediation plan approved.', pom_funded: 'No', navy_region: 'CNRNW', custodian_activity: 'USCG D13', resource_sponsor: 'CG-9', sponsor_contact: 'LCDR M. Torres, (202) 555-0198', ship_builder: 'Coast Guard Yard', last_roh_cost_k: 4200, est_next_fy_cost_k: 0, total_cost_k: 4200, craft_age_years: 43, last_roh: '2018-09-20', planned_roh: '', planned_mi: '', material_condition: 'Critical', last_dry_dock: '2018-09-20' },
            { _localId: 4, hull_type: 'YTB', hull_number: 'YTB-833', action_need: 'Addition/New Build', requestor: 'NAVSEA 21', date_requested: '2023-01-10', needed_completion: '2032-03-31', lifecycle_years: 35, justification: 'New construction requirement to fill harbor tug capability gap at Norfolk Naval Shipyard. Current fleet aging and insufficient to support increased CVN maintenance tempo. Full funding per FY25 POM submission.', pom_funded: 'Yes', navy_region: 'CNRMA', custodian_activity: 'NNSY', resource_sponsor: 'NAVSEA 21', sponsor_contact: 'Mr. R. Hernandez, (757) 555-0211', ship_builder: 'Dakota Creek Industries', last_roh_cost_k: 0, est_next_fy_cost_k: 28000, total_cost_k: 28000, craft_age_years: 0, last_roh: '', planned_roh: '', planned_mi: '', material_condition: '', last_dry_dock: '' },
            { _localId: 5, hull_type: 'TWR', hull_number: 'TWR-841', action_need: 'Replacement', requestor: 'CNRSE', date_requested: '2022-05-18', needed_completion: '2029-09-30', lifecycle_years: 25, justification: 'Torpedo weapons retriever has exceeded design service life. Recurring propulsion casualties impacting range operations at NUWC Keyport. Replacement vessel required to sustain test and evaluation mission.', pom_funded: 'Pending', navy_region: 'CNRNW', custodian_activity: 'NUWC Keyport', resource_sponsor: 'OPNAV N95', sponsor_contact: 'CAPT L. Park, (703) 555-0177', ship_builder: '', last_roh_cost_k: 1200, est_next_fy_cost_k: 1800, total_cost_k: 18500, craft_age_years: 28, last_roh: '2022-03-01', planned_roh: '2026-08-15', planned_mi: '2025-06-01', material_condition: 'Poor', last_dry_dock: '2022-03-01' },
            { _localId: 6, hull_type: 'YFB', hull_number: 'YFB-92', action_need: 'Transfer', requestor: 'CNRSW', date_requested: '2024-02-01', needed_completion: '2025-06-30', lifecycle_years: 20, justification: 'Ferry boat excess to needs at NSA Mechanicsburg following mission realignment. Transfer to NAVSTA Norfolk recommended to fill harbour ferry gap identified in COMNAVSURFLANT readiness report.', pom_funded: 'No', navy_region: 'CNRMA', custodian_activity: 'NSA Mechanicsburg', resource_sponsor: 'CNIC N4', sponsor_contact: 'Mr. D. Foster, (717) 555-0163', ship_builder: '', last_roh_cost_k: 890, est_next_fy_cost_k: 450, total_cost_k: 1340, craft_age_years: 15, last_roh: '2023-08-10', planned_roh: '2026-02-01', planned_mi: '2025-09-15', material_condition: 'Good', last_dry_dock: '2023-08-10' }
        ];
    }

    // ── Grid Rendering ──────────────────────────────────────────────
    function _renderAcqGrid() {
        var container = document.getElementById('acqGridContainer');
        if (!container) return;

        var filtered = _getFilteredData();
        var html = '<div class="acq-table-wrap"><table class="acq-table"><thead><tr>';

        // Row # header
        html += '<th class="acq-th acq-th-rownum">#</th>';

        // Column headers with sort
        ACQ_COLUMNS.forEach(function (col) {
            var sortIcon = '';
            if (_acqSortCol === col.key) {
                sortIcon = _acqSortDir === 'asc' ? ' <i class="fas fa-sort-up"></i>' : ' <i class="fas fa-sort-down"></i>';
            }
            html += '<th class="acq-th" style="min-width:' + col.width + ';cursor:pointer" onclick="acqSort(\'' + col.key + '\')">' + col.label + sortIcon + '</th>';
        });

        // Actions header
        html += '<th class="acq-th" style="min-width:90px">Actions</th>';
        html += '</tr></thead><tbody>';

        if (!filtered.length) {
            html += '<tr><td colspan="' + (ACQ_COLUMNS.length + 2) + '" style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-ship" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.3"></i>No records found. Add a vessel to get started.</td></tr>';
        } else {
            filtered.forEach(function (row, idx) {
                var isEditing = _acqEditingId === (row.id || row._localId);
                html += '<tr class="acq-row' + (isEditing ? ' acq-row-editing' : '') + '" data-id="' + (row.id || row._localId) + '">';
                html += '<td class="acq-td acq-td-rownum">' + (idx + 1) + '</td>';

                ACQ_COLUMNS.forEach(function (col) {
                    var val = row[col.key] || '';
                    if (isEditing) {
                        html += '<td class="acq-td">' + _renderEditCell(col, val, row.id || row._localId) + '</td>';
                    } else {
                        html += '<td class="acq-td">' + _renderDisplayCell(col, val) + '</td>';
                    }
                });

                // Actions
                if (isEditing) {
                    html += '<td class="acq-td"><button class="acq-btn acq-btn-save" onclick="acqSaveRow(\'' + (row.id || row._localId) + '\')"><i class="fas fa-check"></i></button> <button class="acq-btn acq-btn-cancel" onclick="acqCancelEdit()"><i class="fas fa-times"></i></button></td>';
                } else {
                    html += '<td class="acq-td"><button class="acq-btn acq-btn-edit" onclick="acqEditRow(\'' + (row.id || row._localId) + '\')" title="Edit"><i class="fas fa-pen"></i></button> <button class="acq-btn acq-btn-del" onclick="acqDeleteRow(\'' + (row.id || row._localId) + '\')" title="Delete"><i class="fas fa-trash"></i></button></td>';
                }
                html += '</tr>';
            });
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    function _renderDisplayCell(col, val) {
        if (!val && val !== 0) return '<span class="acq-empty">—</span>';
        if (col.type === 'date' && val) {
            try { return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return val; }
        }
        if (col.type === 'number' && val) return Number(val).toLocaleString();
        if (col.key === 'pom_funded') {
            var cls = val === 'Yes' ? 'acq-badge-green' : val === 'No' ? 'acq-badge-red' : val === 'Partial' ? 'acq-badge-yellow' : 'acq-badge-blue';
            return '<span class="acq-badge ' + cls + '">' + val + '</span>';
        }
        if (col.key === 'material_condition') {
            var mc = { Excellent: 'acq-badge-green', Good: 'acq-badge-blue', Fair: 'acq-badge-yellow', Poor: 'acq-badge-red', Critical: 'acq-badge-critical' };
            return '<span class="acq-badge ' + (mc[val] || '') + '">' + val + '</span>';
        }
        if (col.key === 'action_need') {
            var an = { 'Replacement': 'acq-badge-yellow', 'Disposal/Disposition': 'acq-badge-red', 'Addition/New Build': 'acq-badge-green', 'Service Life Extension': 'acq-badge-blue', 'Transfer': 'acq-badge-purple' };
            return '<span class="acq-badge ' + (an[val] || '') + '">' + val + '</span>';
        }
        if (col.type === 'textarea') {
            var short = val.length > 80 ? val.substring(0, 80) + '…' : val;
            return '<span class="acq-justify" title="' + val.replace(/"/g, '&quot;') + '">' + short + '</span>';
        }
        return val;
    }

    function _renderEditCell(col, val, rowId) {
        var id = 'acq_' + col.key + '_' + rowId;
        if (col.type === 'select') {
            var opts = '<option value="">—</option>';
            (col.options || []).forEach(function (o) {
                opts += '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + o + '</option>';
            });
            return '<select id="' + id + '" class="acq-input">' + opts + '</select>';
        }
        if (col.type === 'textarea') {
            return '<textarea id="' + id + '" class="acq-input acq-textarea" rows="2">' + (val || '') + '</textarea>';
        }
        var inputType = col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text';
        return '<input id="' + id + '" type="' + inputType + '" class="acq-input" value="' + (val || '') + '">';
    }

    // ── Filtering ──────────────────────────────────────────────────
    function _getFilteredData() {
        var data = _acqData.slice();

        // Program filter (multi-select)
        if (_acqSelectedPrograms !== null && _acqSelectedPrograms !== undefined) {
            var sel = _acqSelectedPrograms;
            data = data.filter(function (r) {
                var p = r.program_name || r.custodian_activity || 'Default Program';
                return sel.indexOf(p) >= 0;
            });
        }

        // Text filter
        if (_acqFilterText) {
            var term = _acqFilterText.toLowerCase();
            data = data.filter(function (r) {
                return ACQ_COLUMNS.some(function (col) {
                    return String(r[col.key] || '').toLowerCase().indexOf(term) >= 0;
                });
            });
        }

        // Sort
        if (_acqSortCol) {
            var col = ACQ_COLUMNS.find(function (c) { return c.key === _acqSortCol; });
            data.sort(function (a, b) {
                var av = a[_acqSortCol] || '', bv = b[_acqSortCol] || '';
                if (col && col.type === 'number') { av = Number(av) || 0; bv = Number(bv) || 0; }
                if (col && col.type === 'date') { av = new Date(av || 0).getTime(); bv = new Date(bv || 0).getTime(); }
                if (av < bv) return _acqSortDir === 'asc' ? -1 : 1;
                if (av > bv) return _acqSortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }

    function acqFilter(val) {
        _acqFilterText = val || '';
        _renderAcqGrid();
    }
    window.acqFilter = acqFilter;

    // ── Sorting ─────────────────────────────────────────────────────
    function acqSort(colKey) {
        if (_acqSortCol === colKey) {
            _acqSortDir = _acqSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            _acqSortCol = colKey;
            _acqSortDir = 'asc';
        }
        _renderAcqGrid();
    }
    window.acqSort = acqSort;

    // ── CRUD: Add Row ──────────────────────────────────────────────
    function acqAddRow() {
        var newRow = { _localId: _acqNextLocalId++ };
        ACQ_COLUMNS.forEach(function (col) { newRow[col.key] = ''; });
        _acqData.unshift(newRow);
        _acqEditingId = newRow._localId;
        _renderAcqGrid();
        _updateAcqStats();
        // Scroll to top of grid
        var wrap = document.querySelector('.acq-table-wrap');
        if (wrap) wrap.scrollTop = 0;
    }
    window.acqAddRow = acqAddRow;

    // ── CRUD: Edit Row ─────────────────────────────────────────────
    function acqEditRow(id) {
        _acqEditingId = id;
        _renderAcqGrid();
    }
    window.acqEditRow = acqEditRow;

    function acqCancelEdit() {
        // If the row being edited has no persisted data, remove it
        var idx = _acqData.findIndex(function (r) { return String(r.id || r._localId) === String(_acqEditingId); });
        if (idx >= 0 && !_acqData[idx]._persisted && !_acqData[idx].hull_type) {
            _acqData.splice(idx, 1);
        }
        _acqEditingId = null;
        _renderAcqGrid();
        _updateAcqStats();
    }
    window.acqCancelEdit = acqCancelEdit;

    // ── CRUD: Save Row ─────────────────────────────────────────────
    function acqSaveRow(id) {
        var row = _acqData.find(function (r) { return String(r.id || r._localId) === String(id); });
        if (!row) return;

        // Read values from inputs
        ACQ_COLUMNS.forEach(function (col) {
            var el = document.getElementById('acq_' + col.key + '_' + id);
            if (el) row[col.key] = el.value;
        });

        // Validate required
        if (!row.hull_type || !row.hull_number) {
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Hull Type and Hull # are required.', 'warning');
            return;
        }

        row.updated_at = new Date().toISOString();
        if (!row.created_at) row.created_at = row.updated_at;

        // Persist to Supabase
        _persistRow(row);

        _acqEditingId = null;
        _renderAcqGrid();
        _updateAcqStats();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Record saved: ' + row.hull_number, 'success');
    }
    window.acqSaveRow = acqSaveRow;

    // ── CRUD: Delete Row ───────────────────────────────────────────
    function acqDeleteRow(id) {
        if (!confirm('Delete this vessel record? This cannot be undone.')) return;
        var idx = _acqData.findIndex(function (r) { return String(r.id || r._localId) === String(id); });
        if (idx < 0) return;
        var row = _acqData[idx];

        // Delete from Supabase if persisted
        if (row.id && window._sbClient) {
            window._sbClient.from('acquisition_plan').delete().eq('id', row.id).then(function () {
                if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Record deleted.', 'info');
            });
        }

        _acqData.splice(idx, 1);
        _renderAcqGrid();
        _updateAcqStats();
    }
    window.acqDeleteRow = acqDeleteRow;

    // ── Supabase Persistence ────────────────────────────────────────
    function _persistRow(row) {
        if (!window._sbClient) { row._persisted = true; return; }

        var payload = {};
        ACQ_COLUMNS.forEach(function (col) {
            var v = row[col.key];
            if (col.type === 'number' && v !== '' && v !== null && v !== undefined) v = Number(v);
            payload[col.key] = v || null;
        });
        payload.updated_at = row.updated_at;
        payload.created_at = row.created_at;
        payload.org_id = sessionStorage.getItem('s4_org_id') || '';
        payload.user_email = sessionStorage.getItem('s4_user_email') || '';

        if (row.id) {
            // Update existing
            window._sbClient.from('acquisition_plan').update(payload).eq('id', row.id).then(function (res) {
                if (res.error) console.warn('ACQ update error:', res.error);
            });
        } else {
            // Insert new
            window._sbClient.from('acquisition_plan').insert([payload]).select().then(function (res) {
                if (res.data && res.data[0]) {
                    row.id = res.data[0].id;
                    row._persisted = true;
                }
                if (res.error) console.warn('ACQ insert error:', res.error);
            });
        }
    }

    // ── Stats ───────────────────────────────────────────────────────
    function _updateAcqStats() {
        var total = _acqData.length;
        var funded = _acqData.filter(function (r) { return r.pom_funded === 'Yes'; }).length;
        var pending = _acqData.filter(function (r) { return r.pom_funded === 'Pending' || r.pom_funded === 'Partial'; }).length;
        var critical = _acqData.filter(function (r) { return r.material_condition === 'Critical' || r.material_condition === 'Poor'; }).length;
        var totalCost = _acqData.reduce(function (sum, r) { return sum + (Number(r.total_cost_k) || 0); }, 0);

        _setTxt('acqStatTotal', total);
        _setTxt('acqStatFunded', funded);
        _setTxt('acqStatPending', pending);
        _setTxt('acqStatCritical', critical);
        _setTxt('acqStatCost', '$' + totalCost.toLocaleString() + 'K');
    }

    function _setTxt(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ── Export: CSV ─────────────────────────────────────────────────
    function acqExportCSV() {
        var data = _getFilteredData();
        if (!data.length) {
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No data to export.', 'warning');
            return;
        }

        var headers = ACQ_COLUMNS.map(function (c) { return c.label; });
        var csvRows = [headers.join(',')];

        data.forEach(function (row) {
            var vals = ACQ_COLUMNS.map(function (c) {
                var v = String(row[c.key] || '').replace(/"/g, '""');
                return '"' + v + '"';
            });
            csvRows.push(vals.join(','));
        });

        var blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'acquisition_plan_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('CSV exported (' + data.length + ' records).', 'success');
    }
    window.acqExportCSV = acqExportCSV;

    // ── Export: XLSX (lightweight — TSV wrapped in Excel XML) ───────
    function acqExportXLSX() {
        var data = _getFilteredData();
        if (!data.length) {
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No data to export.', 'warning');
            return;
        }

        // Build Excel XML spreadsheet
        var xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
        xml += '<Worksheet ss:Name="Acquisition Plan"><Table>';

        // Header row
        xml += '<Row>';
        ACQ_COLUMNS.forEach(function (c) { xml += '<Cell><Data ss:Type="String">' + c.label + '</Data></Cell>'; });
        xml += '</Row>';

        // Data rows
        data.forEach(function (row) {
            xml += '<Row>';
            ACQ_COLUMNS.forEach(function (c) {
                var v = row[c.key] || '';
                var type = (c.type === 'number' && v !== '') ? 'Number' : 'String';
                xml += '<Cell><Data ss:Type="' + type + '">' + String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</Data></Cell>';
            });
            xml += '</Row>';
        });

        xml += '</Table></Worksheet></Workbook>';

        var blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'acquisition_plan_' + new Date().toISOString().slice(0, 10) + '.xls';
        a.click();
        URL.revokeObjectURL(url);
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Excel exported (' + data.length + ' records).', 'success');
    }
    window.acqExportXLSX = acqExportXLSX;

    // ── Anchor Hash ─────────────────────────────────────────────────
    function anchorAcquisitionPlan() {
        if (typeof window._anchorToXRPL === 'function') {
            if (typeof window.showAnchorAnimation === 'function') window.showAnchorAnimation();
            window._anchorToXRPL('Acquisition Plan Record', 'acquisition_plan').finally(function () {
                if (typeof window.hideAnchorAnimation === 'function') window.hideAnchorAnimation();
            });
        } else if (typeof S4 !== 'undefined' && S4.toast) {
            S4.toast('Acquisition plan prepared for XRPL anchoring.', 'info');
        }
    }
    window.anchorAcquisitionPlan = anchorAcquisitionPlan;

    // ── Import CSV ──────────────────────────────────────────────────
    function acqImportCSV() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.tsv,.txt';
        input.onchange = function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                _parseAndImportTabular(ev.target.result, file.name);
            };
            reader.readAsText(file);
        };
        input.click();
    }
    window.acqImportCSV = acqImportCSV;

    // ── Import eNVCR / Database File (JSON, XML, XLS) ──────────────
    function acqImportDatabase() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.tsv,.json,.xml,.xls,.xlsx,.txt';
        input.onchange = function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                var content = ev.target.result;
                var ext = file.name.split('.').pop().toLowerCase();

                if (ext === 'json') {
                    _importJSON(content, file.name);
                } else if (ext === 'xml') {
                    _importXML(content, file.name);
                } else {
                    // CSV/TSV/TXT fallback
                    _parseAndImportTabular(content, file.name);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    window.acqImportDatabase = acqImportDatabase;

    function _parseAndImportTabular(text, filename) {
        var lines = text.split('\n').filter(function (l) { return l.trim(); });
        if (lines.length < 2) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('File appears empty.', 'warning'); return; }

        // Auto-detect delimiter
        var delim = ',';
        if (lines[0].indexOf('\t') >= 0) delim = '\t';
        else if (lines[0].indexOf(';') >= 0) delim = ';';

        var headers = _splitRow(lines[0], delim);
        var imported = 0;

        // Build column map — fuzzy match header names to ACQ_COLUMNS
        var colMap = {};
        ACQ_COLUMNS.forEach(function (col) {
            var idx = headers.findIndex(function (h) {
                var hn = h.toLowerCase().replace(/[_\-\s]+/g, '');
                return hn === col.label.toLowerCase().replace(/[_\-\s]+/g, '')
                    || hn === col.key.toLowerCase().replace(/[_\-\s]+/g, '')
                    || _fuzzyMatch(hn, col);
            });
            if (idx >= 0) colMap[col.key] = idx;
        });

        for (var i = 1; i < lines.length; i++) {
            var vals = _splitRow(lines[i], delim);
            var newRow = { _localId: _acqNextLocalId++ };
            ACQ_COLUMNS.forEach(function (col) {
                if (colMap[col.key] !== undefined && vals[colMap[col.key]]) {
                    newRow[col.key] = vals[colMap[col.key]].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
                } else {
                    newRow[col.key] = '';
                }
            });
            // Try to extract program name from file or data for multi-program support
            if (!newRow.program_name && filename) {
                var prog = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
                newRow.program_name = prog;
            }
            if (newRow.hull_type || newRow.hull_number) {
                _acqData.push(newRow);
                imported++;
            }
        }

        _rebuildProgramList();
        _renderAcqGrid();
        _updateAcqStats();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Imported ' + imported + ' records from ' + (filename || 'file') + '.', 'success');
    }

    function _splitRow(line, delim) {
        if (delim === ',') {
            return (line.match(/("([^"]|"")*"|[^,]*)/g) || []).map(function(v) { return v.replace(/^"|"$/g,'').replace(/""/g,'"').trim(); });
        }
        return line.split(delim).map(function(v) { return v.replace(/^"|"$/g,'').trim(); });
    }

    function _fuzzyMatch(headerNorm, col) {
        // Map common eNVCR / registry field names to our columns
        var aliases = {
            hull_type: ['hullclass','vesseltype','craftclass','hulltype','class','type'],
            hull_number: ['hullno','hullnum','hullnumber','vesselno','designation','hull'],
            action_need: ['actionneed','acquisitionneed','need','action','requirement'],
            material_condition: ['matcond','materialcond','condition','readiness','status'],
            pom_funded: ['pomfunded','funded','pomstatus','fundingstatus','pom'],
            craft_age_years: ['age','ageyrs','ageyears','vesselage','craftage'],
            total_cost_k: ['totalcost','cost','estimatedcost','programcost','totalcostk'],
            ship_builder: ['builder','shipyard','contractor','shipbuilder','vendor'],
            navy_region: ['region','navyregion','homeport','aor'],
            custodian_activity: ['custodian','activity','custodianactivity','command','uic'],
            last_roh: ['lastroh','lastoverhaul','lastmaint','lastrefit'],
            planned_roh: ['plannedroh','nextroh','scheduledoverhaul','nextroh'],
            lifecycle_years: ['lifecycle','servicelife','designlife','usefullife'],
            requestor: ['requestor','requester','pointofcontact','poc','submittedby']
        };
        var list = aliases[col.key] || [];
        return list.indexOf(headerNorm) >= 0;
    }

    function _importJSON(content, filename) {
        try {
            var parsed = JSON.parse(content);
            var records = Array.isArray(parsed) ? parsed : (parsed.records || parsed.data || parsed.vessels || parsed.items || [parsed]);
            var imported = 0;

            records.forEach(function (rec) {
                var newRow = { _localId: _acqNextLocalId++ };
                ACQ_COLUMNS.forEach(function (col) {
                    // Try exact key, then common aliases
                    newRow[col.key] = rec[col.key] || rec[col.label] || rec[col.label.replace(/\s/g,'_').toLowerCase()] || '';
                });
                if (!newRow.program_name && filename) newRow.program_name = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
                if (newRow.hull_type || newRow.hull_number || rec.hull || rec.vessel) {
                    if (!newRow.hull_number && rec.hull) newRow.hull_number = rec.hull;
                    if (!newRow.hull_number && rec.vessel) newRow.hull_number = rec.vessel;
                    _acqData.push(newRow);
                    imported++;
                }
            });

            _rebuildProgramList();
            _renderAcqGrid();
            _updateAcqStats();
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Imported ' + imported + ' records from JSON.', 'success');
        } catch (e) {
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Error parsing JSON: ' + e.message, 'error');
        }
    }

    function _importXML(content, filename) {
        try {
            var parser = new DOMParser();
            var doc = parser.parseFromString(content, 'text/xml');
            // Try common XML structures: <record>, <vessel>, <row>, <item>, <entry>
            var tags = ['record','vessel','row','item','entry','craft','hull','Row'];
            var nodes = [];
            for (var t = 0; t < tags.length; t++) {
                nodes = doc.getElementsByTagName(tags[t]);
                if (nodes.length > 0) break;
            }
            if (!nodes.length) {
                // Fallback: try Worksheet > Row (Excel XML)
                nodes = doc.getElementsByTagName('Row');
            }
            var imported = 0;

            for (var i = 0; i < nodes.length; i++) {
                var newRow = { _localId: _acqNextLocalId++ };
                ACQ_COLUMNS.forEach(function (col) {
                    var el = nodes[i].getElementsByTagName(col.key)[0]
                          || nodes[i].getElementsByTagName(col.label.replace(/\s/g,'_'))[0]
                          || nodes[i].getElementsByTagName(col.label.replace(/\s/g,''))[0];
                    newRow[col.key] = el ? (el.textContent || '').trim() : '';
                });
                if (!newRow.program_name && filename) newRow.program_name = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
                if (newRow.hull_type || newRow.hull_number) {
                    _acqData.push(newRow);
                    imported++;
                }
            }

            _rebuildProgramList();
            _renderAcqGrid();
            _updateAcqStats();
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Imported ' + imported + ' records from XML.', 'success');
        } catch (e) {
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Error parsing XML: ' + e.message, 'error');
        }
    }
    window.acqImportCSV = acqImportCSV;

    function _renderAcqSummary() {
        var el = document.getElementById('acqSummaryView');
        if (!el) return;

        // Group by action_need
        var groups = {};
        _getFilteredData().forEach(function (r) {
            var k = r.action_need || 'Unspecified';
            if (!groups[k]) groups[k] = [];
            groups[k].push(r);
        });

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">';
        Object.keys(groups).forEach(function (k) {
            var items = groups[k];
            var totalCost = items.reduce(function (s, r) { return s + (Number(r.total_cost_k) || 0); }, 0);
            html += '<div class="acq-summary-card">';
            html += '<div class="acq-summary-head"><span class="acq-summary-type">' + k + '</span><span class="acq-summary-count">' + items.length + ' vessel' + (items.length > 1 ? 's' : '') + '</span></div>';
            html += '<div class="acq-summary-cost">Total: $' + totalCost.toLocaleString() + 'K</div>';
            html += '<div class="acq-summary-list">';
            items.forEach(function (r) {
                var cond = r.material_condition || '—';
                html += '<div class="acq-summary-item"><strong>' + (r.hull_number || '—') + '</strong> <span style="color:var(--muted)">(' + (r.hull_type || '') + ')</span> — <span style="font-size:0.78rem">' + cond + '</span></div>';
            });
            html += '</div></div>';
        });
        html += '</div>';
        el.innerHTML = html;
    }

    // ── Gantt Chart Visualization ───────────────────────────────────
    function acqToggleGantt() {
        var grid = document.getElementById('acqGridContainer');
        var summary = document.getElementById('acqSummaryView');
        var gantt = document.getElementById('acqGanttView');
        if (!gantt) return;

        if (gantt.style.display === 'block') {
            gantt.style.display = 'none';
            if (grid) grid.style.display = 'block';
            return;
        }

        if (grid) grid.style.display = 'none';
        if (summary) summary.style.display = 'none';
        gantt.style.display = 'block';
        _renderGantt();
    }
    window.acqToggleGantt = acqToggleGantt;

    function _fmtDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function _renderGantt() {
        var el = document.getElementById('acqGanttView');
        if (!el) return;

        var data = _getFilteredData();
        if (!data.length) {
            el.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)"><i class="fas fa-chart-gantt" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.3"></i>No vessel data to chart. Add records or import data first.</div>';
            return;
        }

        // Determine timeline range from actual data
        var now = new Date();
        var allDates = [];
        data.forEach(function (r) {
            ['date_requested','needed_completion','planned_roh','planned_mi','last_roh','last_dry_dock'].forEach(function (k) {
                if (r[k]) { var d = new Date(r[k]); if (!isNaN(d.getTime())) allDates.push(d); }
            });
        });

        if (!allDates.length) {
            el.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)"><i class="fas fa-calendar-xmark" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.3"></i>No dates found in vessel records. Add date fields to visualize the timeline.</div>';
            return;
        }

        var minDate = new Date(Math.min.apply(null, allDates));
        var maxDate = new Date(Math.max.apply(null, allDates));

        // Pad range by 1 year each side
        var yearStart = minDate.getFullYear() - 1;
        var yearEnd = maxDate.getFullYear() + 2;
        // Ensure current year is visible
        if (now.getFullYear() < yearStart) yearStart = now.getFullYear() - 1;
        if (now.getFullYear() > yearEnd) yearEnd = now.getFullYear() + 1;

        var totalMonths = (yearEnd - yearStart) * 12;
        var timelineStart = new Date(yearStart, 0, 1);

        function dateToPercent(d) {
            if (!d || isNaN(d.getTime())) return -1;
            var monthsFromStart = (d.getFullYear() - yearStart) * 12 + d.getMonth() + d.getDate() / 30;
            return (monthsFromStart / totalMonths) * 100;
        }

        var labelW = 180;
        var html = '<div class="acq-gantt-wrap">';

        // Header
        html += '<div class="acq-gantt-header"><i class="fas fa-chart-gantt"></i> Acquisition Timeline</div>';

        // Legend
        html += '<div class="acq-gantt-legend">';
        html += '<span><span class="acq-gantt-dot" style="background:#4ecb71"></span> Lifecycle Span</span>';
        html += '<span><span class="acq-gantt-dot" style="background:#00aaff"></span> Date Requested</span>';
        html += '<span><span class="acq-gantt-dot" style="background:#c9a84c"></span> Planned ROH</span>';
        html += '<span><span class="acq-gantt-dot" style="background:#ff4444"></span> Needed By</span>';
        html += '<span><span class="acq-gantt-dot" style="background:#a855f7"></span> Planned MI</span>';
        html += '</div>';

        // Year ruler
        html += '<div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:0">';
        html += '<div style="flex:0 0 ' + labelW + 'px;padding:4px 8px;font-size:0.7rem;color:var(--muted)"></div>';
        html += '<div style="flex:1;position:relative;height:24px">';
        for (var y = yearStart; y <= yearEnd; y++) {
            var yPct = ((y - yearStart) * 12 / totalMonths) * 100;
            var isNowYear = y === now.getFullYear();
            html += '<div style="position:absolute;left:' + yPct + '%;top:0;bottom:0;border-left:1px solid ' + (isNowYear ? 'rgba(0,170,255,0.6)' : 'rgba(255,255,255,0.08)') + ';padding-left:3px">';
            html += '<span style="font-size:0.68rem;color:' + (isNowYear ? '#00aaff' : 'rgba(255,255,255,0.3)') + ';font-weight:' + (isNowYear ? '700' : '400') + '">' + y + '</span></div>';
        }
        // "Today" marker
        var todayPct = dateToPercent(now);
        if (todayPct >= 0 && todayPct <= 100) {
            html += '<div style="position:absolute;left:' + todayPct + '%;top:0;bottom:0;border-left:2px dashed rgba(0,170,255,0.5);z-index:3" title="Today: ' + _fmtDate(now.toISOString()) + '"></div>';
        }
        html += '</div></div>';

        // Vessel rows
        data.forEach(function (r, idx) {
            var condCls = { Excellent: 'acq-badge-green', Good: 'acq-badge-blue', Fair: 'acq-badge-yellow', Poor: 'acq-badge-red', Critical: 'acq-badge-critical' };
            var condBadge = r.material_condition ? ' <span class="acq-badge ' + (condCls[r.material_condition] || '') + '" style="font-size:0.6rem;padding:0px 4px;vertical-align:middle">' + r.material_condition + '</span>' : '';
            var bgAlt = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)';

            html += '<div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.04);background:' + bgAlt + '">';
            // Label
            html += '<div style="flex:0 0 ' + labelW + 'px;padding:8px 8px;font-size:0.78rem;color:var(--steel);overflow:hidden;white-space:nowrap;text-overflow:ellipsis"><strong style="color:#fff">' + (r.hull_number || '—') + '</strong>' + condBadge + '</div>';
            // Timeline
            html += '<div style="flex:1;position:relative;min-height:36px">';

            // Year grid lines
            for (var y2 = yearStart; y2 <= yearEnd; y2++) {
                var yPct2 = ((y2 - yearStart) * 12 / totalMonths) * 100;
                var isNow2 = y2 === now.getFullYear();
                html += '<div style="position:absolute;left:' + yPct2 + '%;top:0;bottom:0;border-left:1px solid ' + (isNow2 ? 'rgba(0,170,255,0.15)' : 'rgba(255,255,255,0.03)') + '"></div>';
            }

            // Today line
            if (todayPct >= 0 && todayPct <= 100) {
                html += '<div style="position:absolute;left:' + todayPct + '%;top:0;bottom:0;border-left:2px dashed rgba(0,170,255,0.2);z-index:2"></div>';
            }

            // Lifecycle span bar
            if (r.date_requested && r.needed_completion) {
                var startPct = dateToPercent(new Date(r.date_requested));
                var endPct = dateToPercent(new Date(r.needed_completion));
                if (startPct >= 0 && endPct >= 0 && endPct > startPct) {
                    html += '<div class="acq-gantt-bar" style="left:' + startPct + '%;width:' + (endPct - startPct) + '%;background:rgba(78,203,113,0.2);border:1px solid rgba(78,203,113,0.45)" title="' + _fmtDate(r.date_requested) + ' → ' + _fmtDate(r.needed_completion) + '"></div>';
                }
            }

            // Milestone markers with date labels
            var markers = [
                { key: 'date_requested', color: '#00aaff', label: 'Requested' },
                { key: 'planned_roh', color: '#c9a84c', label: 'Planned ROH' },
                { key: 'needed_completion', color: '#ff4444', label: 'Needed By' },
                { key: 'planned_mi', color: '#a855f7', label: 'Planned MI' }
            ];
            markers.forEach(function (m) {
                if (!r[m.key]) return;
                var d = new Date(r[m.key]);
                var pct = dateToPercent(d);
                if (pct < 0 || pct > 100) return;
                var ttip = m.label + ': ' + _fmtDate(r[m.key]);
                html += '<div class="acq-gantt-marker" style="left:' + pct + '%;background:' + m.color + '" title="' + ttip + '"></div>';
                // Date label below marker
                html += '<div style="position:absolute;left:' + pct + '%;top:70%;transform:translateX(-50%);font-size:0.55rem;color:' + m.color + ';white-space:nowrap;opacity:0.8;pointer-events:none">' + _fmtDate(r[m.key]) + '</div>';
            });

            html += '</div></div>';
        });

        html += '</div>';
        el.innerHTML = html;
    }

    // ── Multi-Program Switcher (Dropdown with multi-select + custom add) ──
    function _rebuildProgramList() {
        var progs = {};
        _acqData.forEach(function (r) {
            var p = r.program_name || r.custodian_activity || 'Default Program';
            progs[p] = true;
        });
        _acqPrograms = Object.keys(progs).sort();
        _renderProgramSwitcher();
    }

    function _renderProgramSwitcher() {
        var el = document.getElementById('acqProgramSwitcher');
        if (!el) return;

        // Build selected set
        var selectedSet = _acqSelectedPrograms || null; // null = all

        var html = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
        html += '<label style="color:var(--steel);font-size:0.8rem;font-weight:600;white-space:nowrap"><i class="fas fa-sitemap" style="margin-right:4px"></i>Programs:</label>';

        // Multi-select dropdown
        html += '<div class="acq-prog-dropdown" style="position:relative;display:inline-block">';
        html += '<button class="acq-prog-btn acq-prog-active" onclick="acqToggleProgramDropdown()" style="min-width:200px;text-align:left;display:flex;justify-content:space-between;align-items:center">';
        var selLabel = !selectedSet ? 'All Programs (' + _acqPrograms.length + ')' : selectedSet.length + ' of ' + _acqPrograms.length + ' selected';
        html += '<span>' + selLabel + '</span> <i class="fas fa-chevron-down" style="font-size:0.65rem;margin-left:8px;opacity:0.6"></i>';
        html += '</button>';

        // Dropdown panel (hidden by default)
        html += '<div id="acqProgDropdownPanel" style="display:none;position:absolute;top:100%;left:0;z-index:100;min-width:280px;max-height:300px;overflow-y:auto;background:#0d1117;border:1px solid rgba(255,255,255,0.15);border-radius:3px;margin-top:4px;padding:8px 0;box-shadow:0 8px 24px rgba(0,0,0,0.5)">';

        // "All Programs" option at top
        html += '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-size:0.82rem;color:#8b949e;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px">';
        html += '<input type="checkbox" ' + (!selectedSet ? 'checked' : '') + ' onchange="acqSelectAllPrograms(this.checked)" style="accent-color:#00aaff;width:15px;height:15px"> <strong style="color:#fff">All Programs</strong></label>';

        // Individual programs
        _acqPrograms.forEach(function (p) {
            var checked = !selectedSet || selectedSet.indexOf(p) >= 0;
            var safeP = p.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += '<label style="display:flex;align-items:center;gap:8px;padding:4px 12px;cursor:pointer;font-size:0.82rem;color:var(--steel);transition:background 0.15s" onmouseover="this.style.background=\'rgba(0,170,255,0.06)\'" onmouseout="this.style.background=\'transparent\'">';
            html += '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="acqToggleProgram(\'' + safeP + '\', this.checked)" style="accent-color:#00aaff;width:15px;height:15px"> ' + p + '</label>';
        });

        // "Add custom program" row
        html += '<div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;padding:6px 12px">';
        html += '<div style="display:flex;gap:6px"><input id="acqNewProgInput" type="text" placeholder="Add new program…" style="flex:1;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:5px 8px;font-size:0.8rem" onkeydown="if(event.key===\'Enter\')acqAddProgram()">';
        html += '<button class="acq-prog-btn" onclick="acqAddProgram()" style="padding:4px 10px;font-size:0.78rem"><i class="fas fa-plus"></i></button></div></div>';
        html += '</div></div>';

        // Active program chips (when filtering)
        if (selectedSet && selectedSet.length < _acqPrograms.length) {
            selectedSet.forEach(function (p) {
                html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:3px;background:rgba(0,170,255,0.12);border:1px solid rgba(0,170,255,0.25);color:#00aaff;font-size:0.75rem;white-space:nowrap">' + p + ' <span onclick="acqToggleProgram(\'' + p.replace(/'/g, "\\'") + '\', false)" style="cursor:pointer;opacity:0.7;font-size:0.85rem">&times;</span></span>';
            });
        }

        html += '</div>';
        el.innerHTML = html;
    }

    // Track selected programs: null = all, array = specific selection
    var _acqSelectedPrograms = null;

    function acqToggleProgramDropdown() {
        var panel = document.getElementById('acqProgDropdownPanel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';

        // Close on outside click
        if (panel.style.display === 'block') {
            setTimeout(function () {
                function closeHandler(e) {
                    if (!panel.contains(e.target) && !e.target.closest('.acq-prog-dropdown')) {
                        panel.style.display = 'none';
                        document.removeEventListener('click', closeHandler);
                    }
                }
                document.addEventListener('click', closeHandler);
            }, 0);
        }
    }
    window.acqToggleProgramDropdown = acqToggleProgramDropdown;

    function acqSelectAllPrograms(checked) {
        if (checked) {
            _acqSelectedPrograms = null; // null = all
        } else {
            _acqSelectedPrograms = [];
        }
        _acqCurrentProgram = 'all';
        _renderProgramSwitcher();
        _renderAcqGrid();
        _updateAcqStats();
    }
    window.acqSelectAllPrograms = acqSelectAllPrograms;

    function acqToggleProgram(prog, checked) {
        // If currently "all", switch to explicit selection
        if (_acqSelectedPrograms === null) {
            if (checked) return; // already all selected, nothing to do
            _acqSelectedPrograms = _acqPrograms.filter(function (p) { return p !== prog; });
        } else {
            if (checked) {
                if (_acqSelectedPrograms.indexOf(prog) < 0) _acqSelectedPrograms.push(prog);
            } else {
                _acqSelectedPrograms = _acqSelectedPrograms.filter(function (p) { return p !== prog; });
            }
            // If all are selected again, reset to null
            if (_acqSelectedPrograms.length >= _acqPrograms.length) {
                _acqSelectedPrograms = null;
            }
        }
        _renderProgramSwitcher();
        _renderAcqGrid();
        _updateAcqStats();
    }
    window.acqToggleProgram = acqToggleProgram;

    function acqAddProgram() {
        var input = document.getElementById('acqNewProgInput');
        if (!input || !input.value.trim()) return;
        var name = input.value.trim();
        if (_acqPrograms.indexOf(name) >= 0) {
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Program "' + name + '" already exists.', 'warning');
            return;
        }
        _acqPrograms.push(name);
        _acqPrograms.sort();
        // Auto-select the new program
        if (_acqSelectedPrograms !== null) {
            _acqSelectedPrograms.push(name);
        }
        _renderProgramSwitcher();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Program "' + name + '" added.', 'success');
    }
    window.acqAddProgram = acqAddProgram;

    // ── View Toggle: Grid vs Summary vs Gantt ───────────────────────
    function acqToggleView(view) {
        var grid = document.getElementById('acqGridContainer');
        var summary = document.getElementById('acqSummaryView');
        var gantt = document.getElementById('acqGanttView');
        if (!grid || !summary) return;

        if (view === 'summary') {
            grid.style.display = 'none';
            if (gantt) gantt.style.display = 'none';
            summary.style.display = 'block';
            _renderAcqSummary();
        } else if (view === 'gantt') {
            grid.style.display = 'none';
            summary.style.display = 'none';
            if (gantt) gantt.style.display = 'block';
            _renderGantt();
        } else {
            grid.style.display = 'block';
            summary.style.display = 'none';
            if (gantt) gantt.style.display = 'none';
        }
    }
    window.acqToggleView = acqToggleView;

})();
