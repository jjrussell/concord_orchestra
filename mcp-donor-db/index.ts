import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import * as dotenv from "dotenv";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const username = process.env.DONOR_DB_USERNAME;
const password = process.env.DONOR_DB_PASSWORD;
const baseUrl = process.env.BASE_URL || "https://www.concordorchestra-internal.com";

if (!username || !password) {
  console.error("Missing DONOR_DB_USERNAME or DONOR_DB_PASSWORD in .env file");
  process.exit(1);
}

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, baseURL: baseUrl } as any));

const server = new Server(
  {
    name: "concord-orchestra-donor-db",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Session state to minimize logins
let isLoggedIn = false;

async function ensureAuthenticated() {
  if (isLoggedIn) return;
  try {
    await client.get("/Reporting/PatronsDetails_list.php");
    const loginData = new URLSearchParams();
    loginData.append("username", username!);
    loginData.append("password", password!);
    loginData.append("btnSubmit", "Login"); 

    const postRes = await client.post("/Reporting/login.php", loginData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": `${baseUrl}/Reporting/login.php`
      },
      maxRedirects: 5 
    });

    if (postRes.config.url?.includes("login.php")) {
       if (typeof postRes.data === 'string' && (postRes.data.includes("Invalid Login") || postRes.data.includes("Wrong username"))) {
           throw new Error("Authentication failed: Invalid credentials");
       }
    }
    isLoggedIn = true;
  } catch (error: any) {
    console.error("Authentication error:", error.message);
    throw error;
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_donors",
        description: "Search the donor database by name or other attributes.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g., 'Smith')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "create_donor",
        description: "Create a new donor (patron) in the database.",
        inputSchema: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zip: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            mailingList: { 
              type: "string", 
              enum: ["Y", "N"],
              description: "Whether they want to be on the mailing list (Y or N)"
            },
            notes: { type: "string" },
          },
          required: ["firstName", "lastName"],
        },
      },
      {
        name: "list_donations",
        description: "List recent donations for a specific donor to check for duplicates or view history.",
        inputSchema: {
          type: "object",
          properties: {
            donorId: { type: "string", description: "The Patron ID (masterkey) for the donor." },
          },
          required: ["donorId"],
        },
      },
      {
        name: "add_donation",
        description: "Add a contribution to an existing donor.",
        inputSchema: {
          type: "object",
          properties: {
            donorId: { type: "string", description: "The Patron ID (masterkey) for the donor." },
            amount: { type: "string", description: "The amount of the donation (e.g., '100.00')" },
            date: { type: "string", description: "The date in YYYY-MM-DD format." },
            earmark: { 
              type: "string", 
              description: "Must be one of: General, Piano, New Works, Ehlers, Sponsor, E-Coustics",
              enum: ["General", "Piano", "New Works", "Ehlers", "Sponsor", "E-Coustics"]
            },
            checkNum: { type: "string" },
            inMemory: { type: "string" },
            comments: { type: "string" },
            taxReceiptSent: { type: "boolean" },
            thankYouSent: { type: "boolean" }
          },
          required: ["donorId", "amount", "date"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  await ensureAuthenticated();

  if (request.params.name === "search_donors") {
    try {
      const { query } = request.params.arguments as any;
      const res = await client.get(`/Reporting/PatronsDetails_list.php?qs=${encodeURIComponent(query)}`);
      const html = res.data as string;
      const $ = cheerio.load(html);

      // Extract gridRows JSON from the controlsMap script
      const scriptTags = $("script").toArray();
      let gridRows: any[] = [];
      for (const script of scriptTags) {
        const content = $(script).html() || "";
        if (content.includes("window.controlsMap")) {
          const match = content.match(/"gridRows":(\[.*?\]),"gMaps"/);
          if (match && match[1]) {
            try {
              gridRows = JSON.parse(match[1]);
            } catch (e) {
              // Ignore parse errors
            }
          }
          break;
        }
      }

      const donors = gridRows.map(row => {
        const id = row.id;
        const donorId = row.keys[0];
        return {
          donorId,
          lastName: $(`#edit${id}_LastName`).text().trim(),
          firstName: $(`#edit${id}_FirstName`).text().trim(),
          address: $(`#edit${id}_Address`).text().trim(),
          city: $(`#edit${id}_City`).text().trim(),
          state: $(`#edit${id}_State`).text().trim(),
          zip: $(`#edit${id}_ZIP`).text().trim(),
          notes: $(`#edit${id}_Notes`).text().trim()
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(donors, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Search failed: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "create_donor") {
    try {
      const args = request.params.arguments as any;
      const formData = new URLSearchParams();
      
      formData.append("a", "added");
      if (args.firstName) formData.append("value_FirstName_1", args.firstName);
      if (args.lastName) formData.append("value_LastName_1", args.lastName);
      if (args.address) formData.append("value_Address_1", args.address);
      if (args.city) formData.append("value_City_1", args.city);
      if (args.state) formData.append("value_State_1", args.state);
      if (args.zip) formData.append("value_ZIP_1", args.zip);
      if (args.email) formData.append("value_Email_1", args.email);
      if (args.phone) formData.append("value_Phone_1", args.phone);
      if (args.notes) formData.append("value_Notes_1", args.notes);
      
      // Default to 'Y' if not provided
      const mailingList = args.mailingList || "Y";
      formData.append("value_MailingList_1", mailingList);
      formData.append("radio_MailingList_1", mailingList);

      const res = await client.post("/Reporting/PatronsDetails_add.php", formData, {
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": `${baseUrl}/Reporting/PatronsDetails_list.php`
        }
      });

      // Simple check to see if it likely succeeded
      if (res.status === 200 || res.status === 302) {
         return {
          content: [{ type: "text", text: `Successfully submitted creation request for ${args.firstName} ${args.lastName}` }],
         };
      } else {
         throw new Error(`Unexpected status code: ${res.status}`);
      }

    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Create donor failed: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "list_donations") {
    try {
      const { donorId } = request.params.arguments as any;
      const contribRes = await client.get(`/Reporting/ContributionsDetails_list.php?mastertable=PatronsDetails&masterkey1=${donorId}`);
      const cHtml = contribRes.data as string;
      const $c = cheerio.load(cHtml);

      let contribRows: any[] = [];
      $c("script").each((_, script) => {
        const content = $c(script).html() || "";
        if (content.includes("window.controlsMap")) {
          const match = content.match(/"gridRows":(\[.*?\]),"gMaps"/);
          if (match && match[1]) {
            try { contribRows = JSON.parse(match[1]); } catch(e) {}
          }
        }
      });

      const donations: any[] = [];
      contribRows.forEach(row => {
          const id = row.id;
          const date = $c(`#edit${id}_Date`).text().trim() || $c(`span[id^="edit${id}_Date"]`).text().trim() || $c(`[data-field="Date"][data-record-id="${id}"]`).text().trim();
          const amount = $c(`#edit${id}_Amount`).text().trim() || $c(`span[id^="edit${id}_Amount"]`).text().trim() || $c(`[data-field="Amount"][data-record-id="${id}"]`).text().trim();
          const earmark = $c(`#edit${id}_Earmark`).text().trim() || $c(`span[id^="edit${id}_Earmark"]`).text().trim() || $c(`[data-field="Earmark"][data-record-id="${id}"]`).text().trim();
          const comments = $c(`#edit${id}_Comments`).text().trim() || $c(`span[id^="edit${id}_Comments"]`).text().trim() || $c(`[data-field="Comments"][data-record-id="${id}"]`).text().trim();
          
          if (date || amount) {
            donations.push({ id: row.keys[0], date, amount, earmark, comments });
          }
      });

      return {
        content: [{ type: "text", text: JSON.stringify(donations, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `List donations failed: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "add_donation") {
    try {
      const args = request.params.arguments as any;
      const formData = new URLSearchParams();
      
      formData.append("a", "added");
      formData.append("type_Date_1", "date13");
      formData.append("value_Date_1", args.date);
      formData.append("value_Amount_1", args.amount);
      
      if (args.earmark) formData.append("value_Earmark_1", args.earmark);
      if (args.checkNum) formData.append("value_CheckNum_1", args.checkNum);
      if (args.inMemory) formData.append("value_InMemory_1", args.inMemory);
      if (args.comments) formData.append("value_Comments_1", args.comments);
      
      formData.append("type_TaxReceiptSent_1", "checkbox");
      if (args.taxReceiptSent) formData.append("value_TaxReceiptSent_1", "on");
      
      formData.append("type_ThankYouSent_1", "checkbox");
      if (args.thankYouSent) formData.append("value_ThankYouSent_1", "on");

      const res = await client.post(`/Reporting/ContributionsDetails_add.php?mastertable=PatronsDetails&masterkey1=${args.donorId}`, formData, {
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": `${baseUrl}/Reporting/ContributionsDetails_list.php?mastertable=PatronsDetails&masterkey1=${args.donorId}`
        }
      });

      if (res.status === 200 || res.status === 302) {
         return {
          content: [{ type: "text", text: `Successfully submitted donation of $${args.amount} for donor ID ${args.donorId}.` }],
         };
      } else {
         throw new Error(`Unexpected status code: ${res.status}`);
      }

    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Add donation failed: ${error.message}` }],
        isError: true,
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Concord Orchestra Donor DB MCP Server running on stdio");
}

run().catch(console.error);
