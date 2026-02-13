# Render.com Deployment Guide for S4 Ledger

## 1. Deploy Static Site (index.html, metrics.html)
- Go to https://render.com and sign up/log in.
- Click 'New Static Site'.
- Connect your GitHub repo (s4-ledger).
- Select the branch (main) and root directory.
- Render will auto-deploy index.html, metrics.html, and other static files.
- After deployment, your site will be live at a Render.com URL (e.g., s4ledger.onrender.com).
- To update, push changes to GitHub and Render will redeploy automatically.

## 2. Deploy Metrics API (metrics_api.py)
- Click 'New Web Service' on Render.com.
- Connect your GitHub repo.
- Set build command: `pip install flask xrpl-py`
- Set start command: `python metrics_api.py`
- Choose Python environment.
- Set port to 5050 (or default Render port).
- After deployment, your API will be live at a Render.com URL (e.g., s4-ledger-metrics-api.onrender.com).

## 3. Update metrics.html for Live Data
- Edit metrics.html to fetch from your Render.com API endpoint (replace `http://localhost:5050/metrics` with your Render.com URL).
- Push changes to GitHub for redeployment.

## 4. Troubleshooting
- If changes don’t show, check Render build logs and ensure you’re pushing to the correct branch.
- Static site and API may have different URLs—update links as needed.

## 5. Support
- For help, contact info@s4ledger.com or Render.com support.
