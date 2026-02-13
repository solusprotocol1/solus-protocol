# Deployment Guide: S4 Ledger

## Local Deployment
1. Clone the repo: `git clone https://github.com/s4ledger/s4-ledger.git`
2. Install dependencies: `pip install -r requirements.txt`
3. Run tests: `pytest`
4. Use Docker: `docker build -t s4-ledger-sdk . && docker run s4-ledger-sdk`

## Production Deployment
- Set up secure environment variables for XRPL seed and gateway issuer
- Use CI/CD workflow (.github/workflows/ci.yml) for automated testing and deployment
- Host SDK and API endpoints on secure cloud (AWS, Azure, GCP)
- Enable audit logging and webhook notifications

## Partner Integration
- See PARTNER_ONBOARDING.md for step-by-step integration
- Contact info@s4ledger.com for onboarding

## Troubleshooting
- See README.md for common issues and solutions