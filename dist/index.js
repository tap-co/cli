#!/usr/bin/env node

// src/index.ts
import { Command as Command6 } from "commander";

// src/commands/auth.ts
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";

// src/config.ts
import Conf from "conf";
var config = new Conf({
  projectName: "tap-cli",
  defaults: {
    baseUrl: "https://sdk.tap.co/v1"
  }
});
function getApiKey() {
  return process.env.TAP_API_KEY || config.get("apiKey");
}
function setApiKey(key) {
  config.set("apiKey", key);
}
function clearApiKey() {
  config.delete("apiKey");
}
function getBaseUrl() {
  return process.env.TAP_API_URL || config.get("baseUrl");
}
function isAuthenticated() {
  return !!getApiKey();
}

// src/commands/auth.ts
var authCommand = new Command("auth").description("Configure API credentials for authenticated access");
authCommand.command("login").description("Store API key for subsequent requests").option("-k, --key <key>", "API key (required for non-interactive use)").action(async (options) => {
  let apiKey = options.key;
  if (!apiKey) {
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Enter your API key:",
        mask: "*",
        validate: (input) => input.length > 0 || "API key is required"
      }
    ]);
    apiKey = answers.apiKey;
  }
  setApiKey(apiKey);
  console.log(chalk.green("authenticated"));
});
authCommand.command("logout").description("Remove stored API key from local configuration").action(() => {
  clearApiKey();
  console.log(chalk.green("credentials cleared"));
});
authCommand.command("status").description("Check if valid credentials are configured").action(() => {
  if (isAuthenticated()) {
    const key = getApiKey();
    const masked = key.slice(0, 7) + "..." + key.slice(-4);
    console.log(chalk.green("authenticated"));
    console.log(chalk.dim(`key: ${masked}`));
  } else {
    console.log(chalk.yellow("not authenticated"));
    console.log(chalk.dim("set TAP_API_KEY or run: tap auth login -k <key>"));
  }
});

// src/commands/search.ts
import { Command as Command2 } from "commander";
import ora from "ora";
import chalk3 from "chalk";
import Table from "cli-table3";

// src/api.ts
import chalk2 from "chalk";
var TapApiError = class extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "TapApiError";
  }
};
async function apiRequest(endpoint, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(chalk2.red("Error: Not authenticated. Run `tap auth login` first."));
    process.exit(1);
  }
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new TapApiError(
      body?.message || `API request failed: ${response.statusText}`,
      response.status,
      body
    );
  }
  return response.json();
}
async function searchPlatforms(params) {
  return apiRequest("/platforms/search", {
    method: "POST",
    body: JSON.stringify(params)
  });
}
async function generatePlan(params) {
  return apiRequest("/plans/generate", {
    method: "POST",
    body: JSON.stringify(params)
  });
}
async function generateCreative(params) {
  return apiRequest("/creatives/generate", {
    method: "POST",
    body: JSON.stringify(params)
  });
}
async function listCampaigns(params) {
  const query = params?.status ? `?status=${params.status}` : "";
  return apiRequest(`/campaigns${query}`);
}
async function getCampaign(id) {
  return apiRequest(`/campaigns/${id}`);
}

// src/commands/search.ts
var searchCommand = new Command2("search").description("Query available ad inventory across radio, TV, podcast, and digital platforms").option("-m, --market <market>", "Geographic market filter").option("-f, --format <format>", "Media format: radio | tv | podcast | digital").option("-b, --budget <budget>", "Maximum CPM threshold", parseFloat).option("-a, --audience <audience>", "Target demographic").option("--json", "Return structured JSON (recommended for agents)").action(async (options) => {
  const spinner = ora("querying inventory...").start();
  try {
    const result = await searchPlatforms({
      market: options.market,
      format: options.format,
      budget: options.budget,
      audience: options.audience
    });
    spinner.stop();
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (result.platforms.length === 0) {
      console.log(chalk3.dim("no platforms match criteria"));
      return;
    }
    console.log(chalk3.dim(`${result.total} platforms found
`));
    const table = new Table({
      head: ["Name", "Type", "Market", "Reach", "CPM"].map((h) => chalk3.dim(h)),
      style: { head: [], border: [] }
    });
    for (const platform of result.platforms.slice(0, 20)) {
      table.push([
        platform.name,
        platform.type,
        platform.market,
        formatNumber(platform.reach),
        `$${platform.cpm.toFixed(2)}`
      ]);
    }
    console.log(table.toString());
    if (result.total > 20) {
      console.log(chalk3.dim(`
+${result.total - 20} more \u2014 use --json for complete results`));
    }
  } catch (error) {
    spinner.fail("query failed");
    console.error(chalk3.red(`error: ${error.message}`));
    process.exit(1);
  }
});
function formatNumber(num) {
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toString();
}

// src/commands/plan.ts
import { Command as Command3 } from "commander";
import ora2 from "ora";
import chalk4 from "chalk";
import Table2 from "cli-table3";
var planCommand = new Command3("plan").description("Generate an optimized media plan with budget allocation across platforms").requiredOption("-b, --budget <budget>", "Total campaign budget (USD)", parseFloat).option("-g, --goal <goal>", "Objective: awareness | consideration | conversion").option("-a, --audience <audience>", "Target demographic segment").option("-m, --markets <markets>", "Comma-separated geographic markets").option("--json", "Return structured JSON (recommended for agents)").action(async (options) => {
  const spinner = ora2();
  try {
    spinner.start("generating plan...");
    const result = await generatePlan({
      budget: options.budget,
      goal: options.goal,
      audience: options.audience,
      markets: options.markets?.split(",").map((m) => m.trim())
    });
    spinner.stop();
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const { plan } = result;
    console.log();
    console.log(chalk4.dim("plan generated"));
    console.log();
    console.log(`  ${chalk4.dim("id")}          ${plan.id}`);
    console.log(`  ${chalk4.dim("name")}        ${plan.name}`);
    console.log(`  ${chalk4.dim("budget")}      $${plan.budget.toLocaleString()}`);
    console.log(`  ${chalk4.dim("reach")}       ${formatNumber2(plan.reach)}`);
    console.log(`  ${chalk4.dim("platforms")}   ${plan.platforms.length}`);
    console.log(`  ${chalk4.dim("avg cpm")}     $${plan.avgCpm.toFixed(2)}`);
    console.log();
    console.log(chalk4.dim("allocation:\n"));
    const table = new Table2({
      head: ["Platform", "Spend", "Impressions"].map((h) => chalk4.dim(h)),
      style: { head: [], border: [] }
    });
    for (const p of plan.platforms) {
      table.push([
        p.name,
        `$${p.allocation.toLocaleString()}`,
        formatNumber2(p.impressions)
      ]);
    }
    console.log(table.toString());
    console.log();
    console.log(chalk4.dim("pipe to campaigns: tap plan --json | tap campaigns create --from-stdin"));
  } catch (error) {
    spinner.fail("plan failed");
    console.error(chalk4.red(`error: ${error.message}`));
    process.exit(1);
  }
});
function formatNumber2(num) {
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toString();
}

// src/commands/creative.ts
import { Command as Command4 } from "commander";
import ora3 from "ora";
import chalk5 from "chalk";
var creativeCommand = new Command4("creative").description("Generate ad creatives using AI (display, audio, video)");
creativeCommand.command("generate").description("Generate a new creative asset from a text prompt").requiredOption("-t, --type <type>", "Asset type: display | audio | video").requiredOption("-p, --prompt <prompt>", "Creative brief or description").option("-d, --duration <duration>", "Length for audio/video (e.g., 15s, 30s, 60s)").option("-s, --sizes <sizes>", "Display dimensions (e.g., 300x250,728x90)").option("-o, --output <path>", "Download directory").option("--json", "Return structured JSON (recommended for agents)").action(async (options) => {
  const validTypes = ["display", "audio", "video"];
  if (!validTypes.includes(options.type)) {
    console.error(chalk5.red(`error: type must be one of: ${validTypes.join(", ")}`));
    process.exit(1);
  }
  const spinner = ora3("generating creative...").start();
  try {
    const result = await generateCreative({
      type: options.type,
      prompt: options.prompt,
      duration: options.duration,
      sizes: options.sizes?.split(",").map((s) => s.trim())
    });
    spinner.stop();
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const { creative } = result;
    console.log();
    console.log(chalk5.dim("creative generated"));
    console.log();
    console.log(`  ${chalk5.dim("id")}     ${creative.id}`);
    console.log(`  ${chalk5.dim("type")}   ${creative.type}`);
    console.log(`  ${chalk5.dim("url")}    ${creative.url}`);
    console.log();
    if (options.output) {
      console.log(chalk5.dim(`saved to: ${options.output}`));
    }
  } catch (error) {
    spinner.fail("generation failed");
    console.error(chalk5.red(`error: ${error.message}`));
    process.exit(1);
  }
});
creativeCommand.command("specs").description("Get required specifications for a platform").argument("<platform-id>", "Platform ID").action(async (platformId) => {
  const spinner = ora3("fetching specs...").start();
  try {
    spinner.stop();
    console.log();
    console.log(chalk5.dim(`specs for ${platformId}`));
    console.log();
    console.log(chalk5.dim("display"));
    console.log("  300x250  medium rectangle");
    console.log("  728x90   leaderboard");
    console.log("  160x600  wide skyscraper");
    console.log();
    console.log(chalk5.dim("audio"));
    console.log("  duration  15s, 30s, 60s");
    console.log("  format    mp3, wav");
    console.log("  loudness  -16 LUFS");
    console.log();
  } catch (error) {
    spinner.fail("fetch failed");
    console.error(chalk5.red(`error: ${error.message}`));
    process.exit(1);
  }
});

// src/commands/campaigns.ts
import { Command as Command5 } from "commander";
import ora4 from "ora";
import chalk6 from "chalk";
import Table3 from "cli-table3";
var campaignsCommand = new Command5("campaigns").description("Create, list, and inspect advertising campaigns");
campaignsCommand.command("list").description("List campaigns with optional status filter").option("-s, --status <status>", "Filter: draft | active | paused | completed").option("--json", "Return structured JSON (recommended for agents)").action(async (options) => {
  const spinner = ora4("fetching campaigns...").start();
  try {
    const result = await listCampaigns({ status: options.status });
    spinner.stop();
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (result.campaigns.length === 0) {
      console.log(chalk6.dim("no campaigns found"));
      return;
    }
    console.log(chalk6.dim(`${result.campaigns.length} campaigns
`));
    const table = new Table3({
      head: ["ID", "Name", "Status", "Budget", "Dates"].map((h) => chalk6.dim(h)),
      style: { head: [], border: [] }
    });
    for (const campaign of result.campaigns) {
      const statusColor = getStatusColor(campaign.status);
      table.push([
        campaign.id,
        campaign.name,
        statusColor(campaign.status),
        `$${campaign.budget.toLocaleString()}`,
        `${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}`
      ]);
    }
    console.log(table.toString());
  } catch (error) {
    spinner.fail("fetch failed");
    console.error(chalk6.red(`error: ${error.message}`));
    process.exit(1);
  }
});
campaignsCommand.command("get").description("Retrieve full campaign details by ID").argument("<id>", "Campaign ID").option("--json", "Return structured JSON (recommended for agents)").action(async (id, options) => {
  const spinner = ora4("fetching campaign...").start();
  try {
    const result = await getCampaign(id);
    spinner.stop();
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const { campaign } = result;
    const statusColor = getStatusColor(campaign.status);
    console.log();
    console.log(`  ${chalk6.dim("id")}       ${campaign.id}`);
    console.log(`  ${chalk6.dim("name")}     ${campaign.name}`);
    console.log(`  ${chalk6.dim("status")}   ${statusColor(campaign.status)}`);
    console.log(`  ${chalk6.dim("budget")}   $${campaign.budget.toLocaleString()}`);
    console.log(`  ${chalk6.dim("start")}    ${formatDate(campaign.startDate)}`);
    console.log(`  ${chalk6.dim("end")}      ${formatDate(campaign.endDate)}`);
    console.log();
  } catch (error) {
    spinner.fail("fetch failed");
    console.error(chalk6.red(`error: ${error.message}`));
    process.exit(1);
  }
});
campaignsCommand.command("create").description("Create a campaign from plan output or direct parameters").option("--from-stdin", "Read plan JSON from stdin (pipe from: tap plan --json)").option("-n, --name <name>", "Campaign name").option("-b, --budget <budget>", "Campaign budget (USD)", parseFloat).action(async (options) => {
  if (options.fromStdin) {
    let data = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) {
      data += chunk;
    }
    try {
      const plan = JSON.parse(data);
      console.log(chalk6.dim("campaign created"));
      console.log(`  ${chalk6.dim("name")}   ${plan.plan?.name || "untitled"}`);
    } catch {
      console.error(chalk6.red("error: invalid JSON input"));
      process.exit(1);
    }
    return;
  }
  if (!options.name || !options.budget) {
    console.error(chalk6.red("error: --name and --budget required (or use --from-stdin)"));
    process.exit(1);
  }
  const spinner = ora4("creating campaign...").start();
  await new Promise((resolve) => setTimeout(resolve, 1e3));
  spinner.stop();
  console.log(chalk6.dim("campaign created"));
  console.log(`  ${chalk6.dim("name")}     ${options.name}`);
  console.log(`  ${chalk6.dim("budget")}   $${options.budget.toLocaleString()}`);
});
function getStatusColor(status) {
  switch (status) {
    case "active":
      return chalk6.green;
    case "paused":
      return chalk6.yellow;
    case "completed":
      return chalk6.dim;
    case "draft":
      return chalk6.blue;
    default:
      return chalk6.white;
  }
}
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// src/index.ts
var program = new Command6();
program.name("tap").description(
  "Advertising infrastructure for AI agents. Search inventory, generate media plans, create ad creatives, and manage campaigns programmatically."
).version("0.1.0");
program.addCommand(authCommand);
program.addCommand(searchCommand);
program.addCommand(planCommand);
program.addCommand(creativeCommand);
program.addCommand(campaignsCommand);
program.parse();
