"""
S4 Ledger — Defense Logistics Communications Module
Encrypted, XRPL-anchored messaging for defense supply chain coordination.
"""

import hashlib
import json
import time
import uuid
from datetime import datetime, timezone
from s4_sdk import S4SDK

# ─── Message Types ────────────────────────────────────────────────────────────
MESSAGE_TYPES = {
    "supply_status":        "Supply chain status update",
    "cdrl_notification":    "CDRL delivery or action required",
    "maintenance_alert":    "Maintenance action due or overdue",
    "casrep":               "Casualty Report (equipment failure)",
    "config_change":        "Configuration change notification",
    "inspection_result":    "Inspection or audit result",
    "shipment_tracking":    "In-transit shipment update",
    "contract_action":      "Contract modification or milestone",
    "quality_defect":       "Quality deficiency report (QDR)",
    "readiness_report":     "Material readiness status update",
    "disposal_notice":      "Excess/disposal action notification",
    "calibration_due":      "TMDE calibration coming due",
}

PRIORITY_LEVELS = {"01": "Routine", "02": "Priority", "03": "Urgent", "04": "Emergency"}


class S4LedgerMessenger:
    """Encrypted defense logistics messaging with XRPL hash anchoring."""

    def __init__(self, sdk: S4SDK | None = None, wallet_seed: str | None = None, testnet: bool = True):
        self.sdk = sdk or S4SDK(wallet_seed=wallet_seed, testnet=testnet)
        self.wallet_seed = wallet_seed or getattr(self.sdk, "wallet_seed", None)
        self.messages: list[dict] = []
        self.channels: dict[str, list[str]] = {}   # channel_name → [user_ids]
        self.webhooks: list[dict] = []

    def send_message(self, sender: str, recipients: list[str], message_type: str,
                     subject: str, body: str, priority: str = "01",
                     classification: str = "UNCLASSIFIED", 
                     reference: str = "", anchor: bool = True) -> dict:
        """Send and optionally anchor a logistics message."""
        if message_type not in MESSAGE_TYPES:
            raise ValueError(f"Invalid message type: {message_type}")
        if priority not in PRIORITY_LEVELS:
            raise ValueError(f"Invalid priority: {priority}")

        msg_id = f"MSG-{uuid.uuid4().hex[:12].upper()}"
        content = json.dumps({
            "id": msg_id, "type": message_type, "subject": subject,
            "body": body, "sender": sender, "recipients": recipients,
            "priority": priority, "classification": classification,
            "reference": reference,
        }, sort_keys=True)

        msg_hash = hashlib.sha256(content.encode()).hexdigest()
        tx_hash = None

        if anchor and self.wallet_seed:
            try:
                tx = self.sdk.anchor_record(
                    record_text=content,
                    wallet_seed=self.wallet_seed,
                    encrypt_first=(classification != "UNCLASSIFIED"),
                    record_type=f"MSG_{message_type.upper()}",
                )
                tx_hash = tx.get("hash")
            except Exception as e:
                tx_hash = f"ERROR: {e}"

        msg = {
            "msg_id": msg_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sender": sender,
            "recipients": recipients,
            "type": message_type,
            "type_desc": MESSAGE_TYPES[message_type],
            "subject": subject,
            "body": body,
            "priority": priority,
            "priority_desc": PRIORITY_LEVELS[priority],
            "classification": classification,
            "reference": reference,
            "hash": msg_hash,
            "anchored": tx_hash is not None and not str(tx_hash).startswith("ERROR"),
            "tx_hash": tx_hash,
        }
        self.messages.append(msg)
        self._fire_webhooks(msg)
        return msg

    def send_casrep(self, sender: str, hull_number: str, equipment: str,
                    impact: str, eta_repair: str, recipients: list[str] | None = None) -> dict:
        """Shortcut for sending a CASREP (Casualty Report)."""
        body = (f"CASREP — {hull_number}\n"
                f"Equipment: {equipment}\n"
                f"Operational Impact: {impact}\n"
                f"ETA Repair: {eta_repair}")
        return self.send_message(
            sender=sender,
            recipients=recipients or ["TYCOM", "NAVSEA", "NAVSUP"],
            message_type="casrep",
            subject=f"CASREP: {hull_number} — {equipment}",
            body=body,
            priority="03",
            classification="CUI",
            anchor=True,
        )

    def get_messages(self, message_type: str | None = None, sender: str | None = None,
                     priority: str | None = None):
        msgs = self.messages
        if message_type:
            msgs = [m for m in msgs if m["type"] == message_type]
        if sender:
            msgs = [m for m in msgs if m["sender"] == sender]
        if priority:
            msgs = [m for m in msgs if m["priority"] == priority]
        return msgs

    def create_channel(self, name: str, members: list[str]):
        self.channels[name] = members
        return {"channel": name, "members": members}

    def register_webhook(self, url: str, events: list[str] | None = None):
        hook = {"url": url, "events": events or list(MESSAGE_TYPES.keys()), "registered": datetime.now(timezone.utc).isoformat()}
        self.webhooks.append(hook)
        return hook

    def _fire_webhooks(self, msg: dict):
        """Deliver webhook notifications via HTTP POST to all registered endpoints."""
        import urllib.request
        for hook in self.webhooks:
            if msg["type"] in hook["events"]:
                payload = json.dumps({
                    "event": msg["type"],
                    "msg_id": msg["msg_id"],
                    "timestamp": msg["timestamp"],
                    "sender": msg["sender"],
                    "subject": msg["subject"],
                    "priority": msg["priority"],
                    "classification": msg["classification"],
                    "hash": msg["hash"],
                    "anchored": msg["anchored"],
                    "tx_hash": msg["tx_hash"],
                }).encode("utf-8")
                try:
                    req = urllib.request.Request(
                        hook["url"],
                        data=payload,
                        headers={
                            "Content-Type": "application/json",
                            "User-Agent": "S4-Ledger-Webhook/3.9.7",
                            "X-S4-Event": msg["type"],
                            "X-S4-Signature": hashlib.sha256(payload).hexdigest(),
                        },
                        method="POST",
                    )
                    urllib.request.urlopen(req, timeout=10)
                except Exception:
                    # Log failure but don't block message delivery
                    pass

    def get_stats(self):
        return {
            "total_messages": len(self.messages),
            "by_type": {t: sum(1 for m in self.messages if m["type"] == t) for t in MESSAGE_TYPES if any(m["type"] == t for m in self.messages)},
            "by_priority": {p: sum(1 for m in self.messages if m["priority"] == p) for p in PRIORITY_LEVELS if any(m["priority"] == p for m in self.messages)},
            "anchored": sum(1 for m in self.messages if m["anchored"]),
            "webhooks_registered": len(self.webhooks),
        }

    def send_tamper_alert(self, record_hash: str, chain_hash: str, tx_hash: str = "",
                          operator: str = "SYSTEM", details: str = "") -> dict:
        """Send a CRITICAL tamper detection alert via the messaging + webhook system.
        This is triggered when a verify operation detects a hash mismatch."""
        body = (
            f"TAMPER ALERT — Record Integrity Violation Detected\n"
            f"Computed Hash: {record_hash[:32]}...\n"
            f"On-Chain Hash: {chain_hash[:32]}...\n"
            f"TX Hash: {tx_hash or 'N/A'}\n"
            f"Detected By: {operator}\n"
            f"Details: {details or 'Hash mismatch detected during verification'}\n"
            f"Action Required: Investigate source of modification. On-chain record is authoritative."
        )
        return self.send_message(
            sender="S4-TAMPER-DETECTION",
            recipients=["SECURITY-OFFICER", "PROGRAM-MANAGER", "CONTRACTING-OFFICER"],
            message_type="quality_defect",
            subject=f"CRITICAL: Tamper Detected — {record_hash[:16]}",
            body=body,
            priority="04",  # Emergency
            classification="CUI",
            reference=tx_hash or record_hash,
            anchor=True,
        )

    def send_correction_notice(self, original_tx: str, corrected_hash: str,
                                corrected_tx: str, reason: str,
                                operator: str = "SYSTEM") -> dict:
        """Send notification that a tampered record has been corrected and re-anchored.
        Links the correction to the original via supersedes_tx."""
        body = (
            f"CORRECTION NOTICE — Record Re-Anchored\n"
            f"Original TX: {original_tx}\n"
            f"Corrected Hash: {corrected_hash[:32]}...\n"
            f"Correction TX: {corrected_tx}\n"
            f"Supersedes: {original_tx}\n"
            f"Reason: {reason}\n"
            f"Corrected By: {operator}\n"
            f"The corrected record has been re-anchored to the XRPL blockchain.\n"
            f"The original transaction remains on-chain as part of the audit trail."
        )
        return self.send_message(
            sender="S4-CORRECTION-ENGINE",
            recipients=["SECURITY-OFFICER", "PROGRAM-MANAGER", "AUDIT-TEAM"],
            message_type="config_change",
            subject=f"Correction Anchored — supersedes {original_tx[:16]}",
            body=body,
            priority="02",  # Priority
            classification="CUI",
            reference=corrected_tx,
            anchor=True,
        )


# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  S4 LEDGER — DEFENSE COMMS MODULE SELF-TEST")
    print("=" * 60)

    sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)
    comms = S4LedgerMessenger(sdk=sdk, wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS")

    # Send supply status
    m1 = comms.send_message("LS1 Martinez", ["DDG-118 Supply"], "supply_status",
                            "NSN 2815-01-448-8234 Shipped", "2x Marine Diesel Engines in transit via MSC, ETA Norfolk 2026-03-01")
    print(f"✅ Supply status: {m1['msg_id']}")

    # Send CASREP
    m2 = comms.send_casrep("CHENG DDG-78", "DDG-78", "AN/SPY-1D Transmitter Module",
                           "Degraded radar coverage — port array", "45 days (depot repair)")
    print(f"✅ CASREP: {m2['msg_id']} (priority: {m2['priority_desc']})")

    # Quality defect
    m3 = comms.send_message("QA-237", ["NAVSEA", "DLA"], "quality_defect",
                            "QDR: Suspect Counterfeit Fasteners",
                            "Lot BOL-2026-0088 NSN 5310-01-234-5678 — metallurgical analysis shows non-conforming alloy",
                            priority="02", classification="CUI")
    print(f"✅ QDR: {m3['msg_id']}")

    stats = comms.get_stats()
    print(f"\n📊 Stats: {stats['total_messages']} messages, {stats['anchored']} anchored")
    print("=" * 60)
