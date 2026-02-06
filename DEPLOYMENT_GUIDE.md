# Deployment Guide: Solus Protocol

## Local Deployment
1. Clone the repo: `git clone https://github.com/solusprotocol1/solus-protocol.git`
2. Install dependencies: `pip install -r requirements.txt`
3. Run tests: `pytest`
4. Use Docker: `docker build -t solus-sdk . && docker run solus-sdk`

## Production Deployment
- Set up secure environment variables for XRPL seed and gateway issuer
- Use CI/CD workflow (.github/workflows/ci.yml) for automated testing and deployment
- Host SDK and API endpoints on secure cloud (AWS, Azure, GCP)
- Enable audit logging and webhook notifications

## Partner Integration
- See PARTNER_ONBOARDING.md for step-by-step integration
- Contact support@solusprotocol.com for onboarding

## Troubleshooting
- See README.md for common issues and solutions