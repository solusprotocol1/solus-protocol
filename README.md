# ![Solus Protocol Logo](https://solusprotocol.com/logo.png) Solus Protocol ($SLS)
**The Immutable Standard for Medical Data Integrity on the XRP Ledger**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Network: XRPL Mainnet](https://img.shields.io/badge/Network-XRPL%20Mainnet-orange)](https://xrpscan.com/token/SLS.r95GyZac4butvVcsTWUPpxzekmyzaHsTA5)
[![Compliance: HIPAA Ready](https://img.shields.io/badge/Compliance-HIPAA%20Ready-green.svg)](WHITEPAPER.md#8-hipaa-regulatory-alignment--technical-safeguards)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## Overview

Solus Protocol is a decentralized infrastructure layer built to bridge legacy Electronic Health Records (EHR) with the transparency of the XRP Ledger. By anchoring cryptographic fingerprints of medical data, we enable real-time validation, auditability, and tamper-proof custody without exposing sensitive Protected Health Information (PHI).

Solus Protocol is designed to establish the standard for secure, patient-controlled medical data integrity in healthcare. We address critical challenges in healthcare data management, such as fragmentation, insecurity, and lack of patient ownership, which cost the US healthcare system approximately $300 billion annually due to mismanagement, redundancies, and inefficiencies (industry estimates, e.g., Persivia 2024 analysis).

Our mission is to empower patients with true data sovereignty while enabling providers (e.g., hospitals like MUSC and SC clinics) to access verifiable, tamper-proof records compliantly and efficiently. Starting with a South Carolina-first approach (headquartered in Mount Pleasant, SC), we prioritize local pilots to drive economic impact before national expansion.

This repository contains a prototype SDK (Software Development Kit) demonstrating core functionality: hashing medical records for integrity, optional encryption for privacy, and storing hashes on XRPL using $SLS as a utility token for fees and incentives. This prototype showcases our progress as an early-stage project and serves as a foundation for production development.

---

## Quick Links
* 📄 **[Whitepaper](WHITEPAPER.md)** - Technical vision, HIPAA alignment, and core protocol logic.
* 🏗️ **[Technical Specs](TECHNICAL_SPECS.md)** - SHA-256 anchoring architecture and XRPL transaction schemas.
* 📈 **[Investor Relations](INVESTOR_RELATIONS.md)** - Tokenomics, roadmap, and ecosystem distribution.
* 🛡️ **[Security Policy](SECURITY.md)** - Responsible disclosure and Safe Harbor guidelines.

---

## 🛠️ Protocol Core Features
* **Immutable Anchoring:** Leverages XRPL transaction memos to create permanent clinical audit trails.
* **Zero-Knowledge Privacy:** Anchors SHA-256 hashes only—ensuring zero patient data is leaked on-chain.
* **Low-Latency Verification:** Validates the integrity of millions of records in seconds using XRPL's high-throughput consensus.
* **Enterprise Interoperability:** Designed for seamless API integration with Epic, Cerner, and other major EHR providers.

---

## Asset Information & Governance

| Attribute | Details |
| :--- | :--- |
| **Token Name** | Solus Protocol |
| **Symbol** | $SLS |
| **Network** | XRP Ledger (XRPL) |
| **Issuer Address** | `r95GyZac4butvVcsTWUPpxzekmyzaHsTA5` |
| **Total Supply** | 100,000,000 SLS (maximum issued; no additional minting without owner action) |
| **Circulating/Issued Supply** | ~69,999,909 SLS (current on XRPL Mainnet; Base ERC-20 representation aligned via burn) |
| **Liquidity** | **Decentralized AMM Pools Enabled** |
| **Utility** | Data Anchoring, Validation, Governance |

### **Official Trust Line**
To hold or trade $SLS, you must establish a trust line to the official issuer address.
> **[Set Trustline via Xaman (Xumm)](https://xumm.community/?issuer=r95GyZac4butvVcsTWUPpxzekmyzaHsTA5&currency=SLS&limit=1000000000)**

---

## Ecosystem Participation & Stakeholders

### **Trading & Liquidity**
Instant liquidity is available via the native XRPL Automated Market Maker (AMM):
* **Swap on Magnetic:** [Swap XRP/SLS](https://xpmarket.com/amm/pool/SLS-r95GyZac4butvVcsTWUPpxzekmyzaHsTA5/XRP)
* **Market Analytics:** [View on XPMarket](https://xmagnetic.org/amm/SLS+r95GyZac4butvVcsTWUPpxzekmyzaHsTA5_XRP+XRP?network=mainnet)

### **Developer Support**
We welcome contributions to the Solus Protocol Gateway API and open-source EHR connectors. 
* See **[CONTRIBUTING.md](CONTRIBUTING.md)** to get started.
* For critical vulnerabilities, refer to our **[Security Policy](SECURITY.md)**.

---

## 🔗 Official Channels
* **Twitter:** [@solus_protocol](https://x.com/solus_protocol)
* **Telegram:** [t.me/solus_protocol](https://t.me/solus_protocol)
* **Explorer:** [XRPScan Token Profile](https://xrpscan.com/token/SLS/r95GyZac4butvVcsTWUPpxzekmyzaHsTA5)

---
*© 2026 Solus Protocol. All rights reserved. SLS is a utility token and does not represent equity or an investment contract.*
---
© 2026 Solus Protocol. Built on the XRP Ledger.

Disclaimer: Solus Protocol is a data integrity tool. It does not provide medical advice or diagnosis. Users are responsible for ensuring compliance with local healthcare regulations (e.g., HIPAA/GDPR).
