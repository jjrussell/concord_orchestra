## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```env
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_ENVIRONMENT=production # or sandbox

# These will be generated during the OAuth flow:
QUICKBOOKS_REFRESH_TOKEN=
QUICKBOOKS_REALM_ID=
```

## Authentication Guide

Authentication works differently depending on whether you are connecting to a **Sandbox** environment or your live **Production** account.

### Option A: Sandbox (Development)
For local testing against a sample QuickBooks company.

1. Go to the [Intuit Developer Portal](https://developer.intuit.com/) and create a new app.
2. Under **Development**, go to **Keys & credentials**.
3. Add `http://localhost:8000/callback` to the app's **Redirect URIs**.
4. Copy the Development Client ID and Client Secret to your `.env` file.
5. Set `QUICKBOOKS_ENVIRONMENT=sandbox` in your `.env`.
6. Run the local authentication server:
   ```bash
   npx tsx auth-runner.ts
   ```
7. A browser will open. Log in, select the sandbox company, and authorize. The script will automatically save the `QUICKBOOKS_REFRESH_TOKEN` and `QUICKBOOKS_REALM_ID` back to your `.env` file.

### Option B: Production (Internal Use Only)
Intuit enforces strict requirements for Production apps. However, for internal CLI tools, you can use the "fast path" to get keys without submitting the app for public review.

#### 1. Bypass the App Assessment & EULA
To access Production keys, Intuit requires you to fill out an App Assessment.
* **EULA and Privacy Policy:** In the production settings, enter your company's main website URL (e.g., `https://www.concordorchestra.com`). Intuit does not manually verify the content for unlisted apps; it only checks for a valid URL.
* **App Assessment Questionnaire:** 
  * **Host Domain:** Enter your company domain (e.g., `concordorchestra.com`).
  * **Launch/Disconnect/Connect URLs:** Use dummy URLs on your domain (e.g., `https://concordorchestra.com/launch`). These are never used for internal apps.
  * **Regulated Industries:** Answer **"No"** to questions about processing payments, lending, or insurance. This avoids triggering a massive third-party security audit.
  * **Security:** Answer the basic security questions honestly (e.g., "Data is stored locally").
* Do **not** submit the app for "Technical Review" or publication.

#### 2. Get Keys & Tokens via the OAuth Playground
Intuit completely bans `localhost` (even with HTTPS) as a valid Redirect URI in their Production environment. Therefore, the local `auth-runner.ts` script will not work.

Instead, use Intuit's built-in OAuth Playground to generate your initial tokens:
1. In the Intuit Developer Portal, go to **Production** -> **Keys & credentials**.
2. Add the official Playground URI to your Redirect URIs and save:
   `https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl`
3. Visit the [Intuit OAuth Playground](https://developer.intuit.com/app/developer/playground).
4. Select **Production** in the environment dropdown.
5. Check the box for the **Accounting** scope (do not select Payments).
6. Click **Get Authorization Code**. Log into your live QuickBooks account and authorize the app.
7. Click **Get Tokens**.
8. Copy the **Refresh Token** and **Company ID** (Realm ID) displayed on the screen.

#### 3. Update your Configuration
Copy the Production Client ID and Client Secret from the Developer Portal, along with the Refresh Token and Realm ID from the Playground, into your `.env` file:
```env
QUICKBOOKS_ENVIRONMENT=production
QUICKBOOKS_CLIENT_ID=your_production_client_id
QUICKBOOKS_CLIENT_SECRET=your_production_client_secret
QUICKBOOKS_REFRESH_TOKEN=your_playground_refresh_token
QUICKBOOKS_REALM_ID=your_playground_company_id
```

Once configured, restart the MCP server / Gemini CLI to apply the new environment variables. The MCP server will use the refresh token to automatically fetch new access tokens as needed.