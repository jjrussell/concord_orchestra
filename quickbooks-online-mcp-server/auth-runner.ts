import * as dotenv from 'dotenv';
import OAuthClient from 'intuit-oauth';
import * as http from 'http';
import open from 'open';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const clientId = process.env.QUICKBOOKS_CLIENT_ID;
const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:8000/callback';

if (!clientId || !clientSecret) {
    console.error("Missing QUICKBOOKS_CLIENT_ID or QUICKBOOKS_CLIENT_SECRET in .env");
    process.exit(1);
}

const oauthClient = new OAuthClient({
    clientId,
    clientSecret,
    environment,
    redirectUri,
});

const port = 8000;

const server = http.createServer(async (req, res) => {
    if (req.url?.startsWith('/callback')) {
        try {
            const response = await oauthClient.createToken(req.url);
            const tokens = response.token;

            console.log('\n✅ Successfully authenticated with QuickBooks!');
            
            // Read existing .env
            const envPath = path.resolve(process.cwd(), '.env');
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
            
            // Update or append tokens
            const updateEnvVar = (key: string, value: string) => {
                const regex = new RegExp(`^${key}=.*`, 'm');
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }
            };

            updateEnvVar('QUICKBOOKS_REFRESH_TOKEN', tokens.refresh_token);
            updateEnvVar('QUICKBOOKS_REALM_ID', tokens.realmId);
            
            fs.writeFileSync(envPath, envContent.trim() + '\n');
            console.log('✅ Saved QUICKBOOKS_REFRESH_TOKEN and QUICKBOOKS_REALM_ID to .env file.');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <body style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
                        <h2 style="color: #2E8B57;">✓ Successfully connected to QuickBooks!</h2>
                        <p>Tokens have been saved to your .env file. You can close this window now.</p>
                    </body>
                </html>
            `);

            setTimeout(() => {
                server.close();
                process.exit(0);
            }, 1000);

        } catch (error) {
            console.error('Error during token creation:', error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error</h1><p>${error}</p>`);
            process.exit(1);
        }
    }
});

server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    const authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting],
        state: 'Init',
    });
    const authUriString = typeof authUri === 'string' ? authUri : (authUri as any).url || authUri.toString();
    console.log(`\nOpening browser to authorize QuickBooks...`);
    console.log(`If it doesn't open automatically, click here:\n${authUriString}\n`);
    open(authUriString);
});
