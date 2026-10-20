// Escher case study: the product screens, the generative UI section and the stack logos,
// all drawn in HTML so they stay sharp, follow the page theme and can move.
// Writes between <!--ill:NAME--> markers in projects/escher/index.html. Styles live in
// projects/escher/screens.css and behaviour in screens.js; the One turn demo has its own turn.css
// and turn.js.
//
//   node scripts/escher-screens.mjs
//
// Run after escher-illustrations.py and escher-icons.py (it inlines its own icons).
// Data: the prototype's seeded demo estate (escher-V7: data/seed/execution.ts, agents.ts,
// design.ts, components/CostSpikeStory.tsx, genui/escher-library.tsx, genui/prompt/chat-rules.ts).
// Logos: Simple Icons (CC0), AWS Architecture Icons (from the prototype, Amazon's terms),
// the AWS wordmark from gilbarbara/logos (CC0). Icons: Phosphor (MIT).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, "../projects/escher/index.html");
const ICONS = join(HERE, "icons");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Icons and logos
// Every icon and logo is drawn once, as a <symbol> in a sprite, and placed with <use>.
const SPRITE = new Map();
function ic(name, cls = "") {
  if (!SPRITE.has("i-" + name)) {
    const raw = readFileSync(join(ICONS, "phosphor/regular", name + ".svg"), "utf8").trim();
    SPRITE.set("i-" + name, `<symbol id="i-${name}" viewBox="0 0 256 256" fill="currentColor">${raw.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</symbol>`);
  }
  return `<svg class="si${cls ? " " + cls : ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}
// Brand colour, or null for marks that are black and should follow the text colour.
const HEX = { react: "#61DAFB", vite: "#646CFF", claude: "#D97757", anthropic: null, openrouter: null, postgresql: "#4169E1", pnpm: "#F69220", turborepo: "#EF4444", vercel: null, tauri: "#24C8D8", electron: "#47848F", python: "#3776AB", tailwindcss: "#06B6D4", typescript: "#3178C6", zod: "#3E67B1", github: null, linear: "#5E6AD2", slack: "#4A154B", terraform: "#844FBA" };
const lgCache = {};
function parts(name) {
  if (lgCache[name]) return lgCache[name];
  let s = readFileSync(join(ICONS, "brands", name + ".svg"), "utf8");
  s = s.replace(/<\?xml[^>]*>\s*/, "").replace(/<title>[\s\S]*?<\/title>/g, "").replace(/\s(id|role|version|xmlns:xlink)="[^"]*"/g, "");
  s = s.replace(/<svg[^>]*>/, (tag) => tag.replace(/\s(width|height)="[^"]*"/g, ""));
  const vb = s.match(/viewBox="([^"]+)"/)[1];
  let inner = s.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/\n\s*/g, "");
  if (name === "aws") inner = inner.replace(/#252f3e/gi, "currentColor");
  const simple = name in HEX;
  if (simple) inner = inner.replace(/<path /g, `<path fill="${HEX[name] || "currentColor"}" `);
  return (lgCache[name] = { vb, inner });
}
function sym(name) {
  const { vb, inner } = parts(name);
  if (!SPRITE.has("l-" + name)) SPRITE.set("l-" + name, `<symbol id="l-${name}" viewBox="${vb}">${inner}</symbol>`);
  return vb;
}
function logo(name, cls = "") {
  const vb = sym(name);
  const [, , w0, h0] = vb.split(/\s+/).map(Number);
  return `<svg class="lg${cls ? " " + cls : ""}" data-lg="${name}" viewBox="${vb}" style="--ar:${(w0 / h0).toFixed(3)}" aria-hidden="true" focusable="false"><use href="#l-${name}"/></svg>`;
}
function logoAt(name, x, y, h) {
  const vb = sym(name);
  const [, , w0, h0] = vb.split(/\s+/).map(Number);
  const w = (h * w0) / h0;
  return `<use class="lg-u" href="#l-${name}" x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}"/>`;
}

// ── Screen chrome
const W = 1200, H = 750;
function fit(inner, { label, fx = 0, cls = "" }) {
  return `<div class="sx-fit${cls ? " " + cls : ""}" style="--fx:${fx}" role="img" aria-label="${esc(label)}"><div class="sx-box"><div class="sx" aria-hidden="true">${inner}</div></div></div>`;
}
const top = `<div class="sx-top"><span class="sx-tl"><i></i><i></i><i></i></span>${ic("sidebar-simple")}${ic("caret-left")}${ic("caret-right", "dim")}${ic("magnifying-glass")}</div>`;
function nav(items, active) {
  return `<ul class="sx-nav">${items.map(([i, t, k]) => `<li${t === active ? ' class="on"' : ""}>${ic(i)}<span>${t}</span>${k ? `<kbd>${k}</kbd>` : ""}</li>`).join("")}</ul>`;
}
const OPERATE = [["note-pencil", "New session", "⌘N"], ["cloud", "Cloud estate"], ["git-branch", "Codebases"], ["plug", "Integrations"], ["bell", "Alerts"], ["calendar-check", "Automations"]];
const DESIGN = [["note-pencil", "New session"], ["books", "Playbooks"], ["download-simple", "Import"], ["wrench", "Tools"], ["book-open", "Knowledge"], ["flask", "Playground"], ["robot", "Agents"], ["graduation-cap", "Skills"]];
const DRAFTS = [["RDS Read-Replica Failover", "v0.3"], ["GKE Autoscaler Tune", "v0.2"], ["VNet Peering Mesh", "v0.1"], ["TLS Certificate Renewal", "v0.1"]];
const PUBLISHED = [["Remediate Open Security Groups", "v1"], ["S3 Lifecycle Policy", "v1"], ["EKS Node-Group Rotation", "v2"], ["IAM Access-Key Rotation", "v1"]];
function side(mode, { active = "New session", analysis = [], executions = [], playbook = "" } = {}) {
  const sw = `<div class="sx-mode"><span${mode === "operate" ? ' class="on"' : ""}>${ic("chat-circle")}Operate</span><span${mode === "design" ? ' class="on"' : ""}>${ic("pencil-simple-line")}Design</span></div>`;
  let body = "";
  if (mode === "operate") {
    const sess = (list) => list.map(([i, t, on, chip]) => `<li${on ? ' class="on"' : ""}>${ic(i)}${chip ? `<em>${chip}</em>` : ""}<span>${t}</span><small>142d</small></li>`).join("");
    body = nav(OPERATE, active) + `<hr><p class="sx-h">Analysis ${ic(analysis.length ? "caret-down" : "caret-right")}</p><ul class="sx-nav sx-sess">${sess(analysis)}</ul><p class="sx-h">Executions ${ic(executions.length ? "caret-down" : "caret-right")}</p><ul class="sx-nav sx-sess">${sess(executions)}</ul>`;
  } else {
    const pb = (list, draft) => list.map(([t, v]) => `<li${t === playbook ? ' class="on"' : ""}><span>${t}</span>${draft ? '<b class="sx-dot"></b>' : ""}<kbd>${v}</kbd></li>`).join("");
    body = nav(DESIGN, active) + `<p class="sx-h">Drafts · 4 ${ic("caret-down")}</p><ul class="sx-nav sx-pb">${pb(DRAFTS, true)}</ul><p class="sx-h">Published · 17 ${ic("caret-down")}</p><ul class="sx-nav sx-pb">${pb(PUBLISHED)}</ul>`;
  }
  const foot = `<div class="sx-me"><span class="sx-av">SR</span><span><b>Sam Rivera</b><small>Org admin</small></span>${ic("gear-six")}<span class="sx-bell">${ic("bell")}</span></div>`;
  return `<aside class="sx-side">${top}${sw}${body}${foot}</aside>`;
}
const composer = (ph, extra = "") => `<div class="sx-comp">${ic("plus")}<span class="sx-ph">${ph}</span>${extra}<span class="sx-send">${ic("paper-plane-tilt")}</span></div>`;
const scope = `<span class="sx-scope">${logo("aws")}prod</span>`;
const user = (t) => `<p class="sx-u">${t}</p>`;
const worked = (t) => `<p class="sx-work">${ic("caret-right")}${t}</p>`;

// ── Home
const PROMPTS = ["How do I fix the top security issue?", "What did EBS snapshots cost us last month?", "How does security posture compare across our 6 accounts?", "Which teams own the non-compliant resources?", "Are there any unhealthy targets in our target groups?"];
const home = fit(
  side("operate", { analysis: [["chat-circle", "Public exposure in prod"]] }) +
  `<div class="sx-main sx-home"><span class="sx-btn sx-art">${ic("sidebar-simple")}Artifacts</span><div class="sx-grid" aria-hidden="true"></div>
<div class="sx-hc"><h4 class="sx-hi">Good afternoon, <i>Sam</i></h4>
<div class="sx-comp big" data-type='${esc(JSON.stringify(PROMPTS.slice(0, 3)))}'><span class="sx-ph" data-ph="What can I help you investigate?">What can I help you investigate?</span><div class="sx-row">${ic("plus")}${scope}${ic("caret-down", "dim")}<span class="sx-sp"></span><span class="sx-seg"><span class="on">${ic("chat-text")}Ask</span><span>${ic("wrench")}Execute</span></span><span class="sx-send dark">${ic("paper-plane-tilt")}</span></div></div>
<ul class="sx-sug">${PROMPTS.map((p) => `<li>${p}${ic("arrow-up-right")}</li>`).join("")}</ul></div></div>`,
  { label: "Escher home: a greeting, the composer scoped to the prod AWS profile with Ask and Execute modes, and five suggested questions.", fx: 300 }
);

// ── Ask: a scan answer with the critical finding open in the canvas
const findRows = [
  ["1 S3 bucket with the public-access block disabled", "With the public-access block off, a single policy can expose it.", "Affects sellers-exports", "crit", "Critical", "saved"],
  ["3 Lambda functions at risk", "The estate reports these resources as at-risk.", "Affects api, lambda-0020 +1 more", "high", "High", "save"],
];
const fcard = `<div class="sx-fc"><p class="sx-fc-h"><i class="sx-cb"></i>2 findings · 1 critical internet exposure</p><p class="sx-fc-l">The bucket is the one to act on today; the Lambda health cluster is worth watching, not fixing.</p>
${findRows.map(([t, d, a, k, kl, s]) => `<div class="sx-fr"><i class="sx-cb"></i><span><b>${t}</b><small>${d}</small><small>${a}</small></span><em class="sx-sev ${k}">${kl}</em>${s === "saved" ? `<span class="sx-saved">${ic("check")}Saved</span>` : `<span class="sx-btn">${ic("bookmark-simple", "")}Save</span>`}${ic("caret-right", "dim")}</div>`).join("")}</div>`;
const details = [
  ["circle-dashed", "Status", '<span class="sx-pill">Open</span>'], ["cloud", "Cloud profile", `${logo("aws")} prod`],
  ["shield", "Severity", '<span class="sx-pill crit">↑ Critical</span>'], ["buildings", "Account", "prod"],
  ["gauge", "Effort", '<span class="sx-pill warn">→ Medium</span>'], ["cube", "Resource", "sellers-exports"],
  ["tag", "Category", '<span class="sx-pill crit">Security</span>'], ["globe", "Region", "us-east-1"],
  ["tree-structure", "Source", "Public exposure in prod"], ["calendar-blank", "Detected", "May 30 · 4:21 PM"],
  ["user", "Assignee", '<span class="sx-av sm">SR</span> Sam Rivera'], ["check", "Saved", "May 30 · 10:30 PM"],
];
const ask = fit(
  side("operate", { analysis: [["chat-circle", "Public exposure in prod", true]] }) +
  `<div class="sx-main sx-split"><div class="sx-thread"><p class="sx-bar">${ic("play")}<em>F-1</em><b>Public exposure in prod</b>${scope}</p>
${user("Where is prod actually at risk? Scan it and show me what is worth recording.")}${worked("Worked for 9s")}
<p class="sx-a">Scanned all three accounts. Two issue types are worth recording: one is a security exposure, the other is reliability headroom.</p>${fcard}
<p class="sx-acts">${ic("copy")}${ic("thumbs-up")}${ic("thumbs-down")}<span>May 30, 2026 · 10:11 PM</span></p>
${user("Hold on, that bucket is called sellers-exports. Isn’t being public the point of it?")}${worked("Worked for 8s")}
<p class="sx-a">The name is not the permission. <code>sellers-exports</code> describes what the bucket holds, not who may read it, and it is served through CloudFront…</p>
${composer("What can I help you investigate?")}</div>
<div class="sx-canvas"><p class="sx-cbar">${ic("lightbulb")}<b>1 S3 bucket with the public…</b><span class="sx-saved">${ic("check")}Saved</span><span class="sx-btn">${ic("wrench")}Resolve finding</span>${ic("arrows-out-simple", "dim")}</p>
<div class="sx-doc"><em class="sx-id">#ufnd_xysj</em><h5>1 S3 bucket with the public-access block disabled</h5><p class="sx-desc">With the public-access block off, a single permissive bucket policy or object ACL is enough to expose this data to anyone on the internet.</p>
<p class="sx-sec">Evidence <span>${ic("arrow-up-right")}Open all ${ic("caret-down")}</span></p><div class="sx-ev">${["Bucket policy", "Public access block", "Object ACL"].map((t) => `<span>${logo("aws")}${t}${ic("arrow-up-right", "dim")}</span>`).join("")}</div>
<p class="sx-sec">Details ${ic("caret-down")}</p><dl class="sx-dl">${details.map(([i, k, v]) => `<div><dt>${ic(i)}${k}</dt><dd>${v}</dd></div>`).join("")}</dl></div></div></div>`,
  { label: "A scan answer listing two findings, one critical. The critical finding is open in the canvas beside the thread, with its evidence, severity, effort and owner.", fx: 744 }
);

// Python with light syntax colour, for the change set files.
function pyLine(s) {
  return esc(s)
    .replace(/(&quot;[^&]*?&quot;)/g, '<span class="k-s">$1</span>')
    .replace(/\b(True|False|None)\b/g, '<span class="k-k">$1</span>')
    .replace(/^(#.*)$/, '<span class="k-c">$1</span>')
    .replace(/\b([a-z_]+)(\()/g, '<span class="k-f">$1</span>$2');
}

// ── Design mode: the library, and one playbook
const PBSTEPS = [["Pre-check & guardrails", "aws.pre_check_guardrails", "reused"], ["Discover targets", "aws.discover_targets", "generated"], ["Evaluate & plan", "aws.evaluate_plan", "reused"], ["Apply the change", "aws.apply_lifecycle", "reused"]];
const props = [["Type", "IaC"], ["Language", `${logo("terraform")} Terraform`], ["Category", "Cost optimization"], ["Steps", "4"], ["Duration", "~2m"], ["Blast radius", "Low"], ["Successful runs", "17/18"], ["Evidence", "4/4 verified"], ["Last modified", "1 week ago"]];
const libView = `<div class="sx-view sx-lib" data-v="lib"><h4 class="sx-hi left">Good evening, Sam</h4><p class="sx-sub">Here’s where your library stands.</p>
<div class="sx-kpi"><div><b>17</b><small>Published</small></div><div><b>4</b><small>Drafts</small></div><div><b>96%</b><small>Avg success</small></div><div class="warn"><b>4</b><small>Need attention</small></div></div>
<div class="sx-comp big"><span class="sx-ph">Ask about your playbooks, or describe one to build…</span><div class="sx-row">${ic("plus")}<span class="sx-sp"></span><span class="sx-send dark">${ic("paper-plane-tilt")}</span></div></div>
<ul class="sx-sug">${["Cross-Region Failover for Multi-AZ Databases is down to an 86% success rate. What’s failing in its recent runs?", "Show me my 4 draft playbooks and what each one still needs before it can be published.", "Walk me through my security coverage: what’s protected and where are the gaps?", "I want to build a new playbook from scratch."].map((p) => `<li>${p}${ic("arrow-up-right")}</li>`).join("")}</ul></div>`;
const pbView = `<div class="sx-view sx-pbv" data-v="pb"><p class="sx-crumb">${logo("aws")}AWS<i>·</i>Created<i>·</i><b class="sx-live"></b>Published v1<span class="sx-btn dark">${ic("play")}Run</span></p><h4 class="sx-hi left">S3 Lifecycle Policy</h4><p class="sx-sub">Apply tiered lifecycle rules to buckets to move cold objects to cheaper storage classes.</p>
<dl class="sx-props">${props.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl><p class="sx-tags"><span>cost</span><span>storage</span></p>
<p class="sx-sec">Steps</p><p class="sx-sub sm"><b>4</b> of 4 steps built · runs top to bottom</p><p class="sx-prov"><i></i>Provided by the run <code>target</code> · <code>region</code></p>
<ol class="sx-pbs">${PBSTEPS.map(([t, f, k], i) => `<li><i></i><div><p><small>${i + 1}</small><b>${t}</b><em>Attached</em></p><p>${ic("wrench")}<code>${f}</code><small>${k}</small></p></div></li>`).join("")}</ol>
${composer("Ask Escher, or describe a change…")}</div>`;
const design = `<figure class="sx-fig" data-live="views"><div class="sx-stage">${fit(
  side("design", { playbook: "" }) + `<div class="sx-main sx-dz" data-view="lib"><span class="sx-btn sx-art">${ic("sidebar-simple")}Playbooks</span>${libView}${pbView}</div>`,
  { label: "Design mode. The library home shows 17 published playbooks, 4 drafts, a 96% average success rate and 4 that need attention. A playbook page shows S3 Lifecycle Policy: Terraform, four steps, 17 of 18 successful runs.", fx: 300 }
)}</div>
<div class="sx-ctl" role="tablist" aria-label="Design mode view"><button type="button" role="tab" data-t="lib" aria-selected="true">Library</button><button type="button" role="tab" data-t="pb" aria-selected="false">Playbook</button></div>
<figcaption data-cap><span data-t="lib">The library at a glance, and questions to ask it.</span><span data-t="pb" hidden>A playbook with its steps, runs and blast radius.</span></figcaption></figure>`;

// ── Agents, with the break-glass lever
const AGENTS = [
  ["Postgres guardian", "live", "Keep the Postgres fleets healthy: failover readiness, replication, patching.", "Acts with approval", "DB Platform", "2h ago"],
  ["Backup warden", "live", "Every backup verified, every restore path tested.", "Acts with approval", "DB Platform", "6h ago"],
  ["Cost sentinel", "live", "Catch spend anomalies before finance does.", "Proposes", "Platform", "12d ago", "rising rejections"],
  ["SecOps triage", "live", "First read on security bulletins and cert expiry, org-wide.", "Observes", "Security", "1d ago"],
  ["Disk-pressure medic", "shadow", "Handle the disk-pressure alerts the DB team keeps clearing by hand.", "Proposes", "DB Platform", "3h ago"],
  ["K8s medic", "paused", "Node health and workload pressure on the prod-eu clusters.", "Acts with approval", "Runtime", "2d ago"],
  ["Network scout", "draft", "VPC and DNS watch for prod-us.", "Observes", "Runtime", ""],
];
const agents = `<figure class="sx-fig" data-live="agents"><div class="sx-stage">${fit(
  side("design", { active: "Agents" }) +
  `<div class="sx-main sx-ag"><div class="sx-agh"><span class="sx-agi">${ic("robot")}</span><h4 class="sx-hi left">Agents</h4><span class="sx-btn dark">${ic("plus")}New agent</span></div>
<p class="sx-sub">Specialists that step in when a task or alert matches their patch. They earn autonomy in stages: defined as a draft, watched in shadow, then live.</p>
<div class="sx-glass"><span class="sx-btn" data-glass>${ic("shield")}<span data-off>Drop all agents to propose-only</span><span data-on>Break glass is on · restore</span></span><span class="sx-sp"></span><span>4 live · 1 shadow · 1 draft · 1 paused</span><b>47 resources uncovered</b></div>
<div class="sx-draft"><span class="sx-agi dark">${ic("robot")}</span><p><b>Escher drafted an agent: Cert-expiry watcher</b><span>Your team renewed 9 TLS certs by hand in the last 60 days, 2 within 48h of expiry.</span></p><span class="sx-btn dark">Review draft</span>${ic("x", "dim")}</div>
<p class="sx-h2">All agents · 7</p><ul class="sx-agl">${AGENTS.map(([n, st, d, m, team, at, flag]) => `<li data-mode="${m === "Acts with approval" ? "act" : m === "Proposes" ? "propose" : "observe"}"><span class="sx-agi">${ic("robot")}</span><div><p><b>${n}</b><em class="st-${st}">${st}</em>${flag ? `<em class="st-flag">${ic("warning")}${flag}</em>` : ""}</p><p>${d}</p><p><span class="sx-am" data-m="${m}">${m}</span> · ${team}${at ? ` · stepped in ${at}` : ""}</p></div></li>`).join("")}</ul>
${composer("Ask Escher, or describe a change…")}</div>`,
  { label: "The agents page: seven agents with their stage, what they do and their mode, under a lever that drops every agent to propose-only.", fx: 300 }
)}</div>
<div class="sx-ctl"><button type="button" data-glass aria-pressed="false">Pull break glass</button><span class="sx-ctl-n">Every agent that can act drops to propose-only. Observers stay as they are.</span></div></figure>`;

// ── Generative UI 1: the same question, answered as text and as interface
const Q = "Our AWS bill jumped 31% this month and finance is asking. What’s going on?";
const TEXT = [
  "Your AWS bill rose about 31% compared with last month. I looked at Cost Explorer grouped by service over the last 90 days and found three main drivers.",
  "First, a new EKS node group called prod-pool was created 12 days ago in us-east-1. It runs eight m6i.2xlarge instances and adds roughly $4,218 per month. Second, a one-year reserved instance renewal of $11,400 was posted on May 1. This is an annual charge rather than an ongoing increase. Third, data transfer out rose about six times between May 14 and 16, which is most likely an S3 backfill, although I can’t see the job itself.",
  "If you exclude the one-time charges, the recurring increase is about $4.2k per month. You may want to consider right-sizing the prod-pool node group and setting up cost anomaly alerts so you catch this earlier next time.",
];
const CITES = {
  1: ["ev", "Evidence", "AWS Cost Explorer", "prod-pool node group: $4,218 / mo", [["Scope", "account · us-east-1"], ["First seen", "12 days ago"], ["Type", "EKS · m6i.2xlarge ×8"]], "May 25, 2026 · 9:13 AM"],
  2: ["ev", "Evidence", "Billing · Savings Plans", "1-yr RI renewal: $11,400, posted May 1", [["Cadence", "annual charge"], ["Next", "May 2027"]], "May 25, 2026 · 9:13 AM"],
  3: ["in", "Inference", "", "The transfer spike is most likely an S3 backfill", [["Basis", "DataTransfer-Out +6× on 14–16 May"], ["Gap", "no job ID, correlation only"]], "May 25, 2026 · 9:14 AM"],
  4: ["as", "Assumption", "", "Treating the backfill as one-off, not recurring", [["Why", "no recurring schedule in 90 days"], ["Risk", "if it recurs, ~$300/mo more"]], "May 25, 2026 · 9:14 AM"],
};
function cite(n) {
  const [k, kl, src, what, kv, ts] = CITES[n];
  return `<button type="button" class="gu-c ${k}" aria-label="Source ${n}: ${kl.toLowerCase()}">${n}<span class="gu-pop" role="tooltip"><span class="gu-pk ${k}"><i></i>${kl}${src ? ` · ${logo("aws")}${src}` : ""}</span><b>${what}</b>${kv.map(([a, b]) => `<span class="gu-kv"><em>${a}</em>${b}</span>`).join("")}<span class="gu-ts">Data as of ${ts}</span></span></button>`;
}
const pin = (n) => `<span class="gu-pin" data-pin="${n}" aria-hidden="true">${n}</span>`;
const UI_WORDS = [];
const say = (s) => (UI_WORDS.push(s.replace(/<[^>]+>/g, " ")), s);
const uiPane = `<div class="gu-pane gu-ui" data-pane="ui"><p class="gu-work">${ic("caret-right")}Fetched Cost Explorer, compared with a 3-month baseline · 1.8s</p>
<p class="gu-lead">${pin(1)}${say("Most of the 31% isn’t real growth. One line costs more every month; the other two are one-offs.")}</p>
<p class="gu-h">${pin(2)}${say("prod-pool is the only recurring increase")}</p>
<p>${say("A new EKS node group, <code>prod-pool</code>, adds $4,218 a month.")}${cite(1)}</p>
<div class="gu-tw">${pin(3)}<div class="gu-tbl"><table><thead><tr><th>${say("Driver")}</th><th>${say("Kind")}</th><th class="r">${say("This month")}</th></tr></thead><tbody>
<tr><td>${say("prod-pool node group")}</td><td><span class="gu-b red">${say("Recurring")}</span></td><td class="r">${say("$4,218")}</td></tr>
<tr><td>${say("Reserved-instance renewal")}</td><td><span class="gu-b">${say("Annual")}</span></td><td class="r">${say("$11,400")}</td></tr>
<tr><td>${say("S3 data transfer")}</td><td><span class="gu-b">${say("One-off")}</span></td><td class="r">${say("6× for 3 days")}</td></tr></tbody></table></div></div>
<p>${pin(4)}${say("The renewal is an annual charge.")}${cite(2)} ${say("The transfer spike looks like an S3 backfill,")}${cite(3)} ${say("so I’m treating it as a one-off.")}${cite(4)}</p>
<p class="gu-take">${say("The honest increase is about $4.2k a month. I’d right-size prod-pool first.")}</p>
<div class="gu-fu">${pin(5)}${["Right-size prod-pool", "Set a cost anomaly alert", "Show transfer by day"].map((t) => `<span>${ic("arrow-right")}${say(t)}</span>`).join("")}</div></div>`;
const textPane = `<div class="gu-pane gu-text" data-pane="text">${TEXT.map((p, i) => `<p>${i === 0 ? pin(2) : ""}${i === 2 ? pin(1) : ""}${p}</p>`).join("")}<p class="gu-end">${pin(3)}<span>End of answer</span></p></div>`;
const words = (s) => s.split(/\s+/).filter((w) => /[\w$]/.test(w)).length;
const wText = words(TEXT.join(" "));
const wUi = words(UI_WORDS.join(" "));
const NOTES = {
  text: [["The answer comes last", "The point, a recurring $4.2k, is in the third paragraph."], ["No sources", "Nothing says which figure came from where, or which ones are guesses."], ["Nothing to act on", "The next step is a suggestion you would have to type back."]],
  ui: [["The answer comes first", "One or two sentences, then the evidence."], ["The heading names the fact", "Not “Findings” or “Cost”, but the thing you need to know."], ["One component for one point", "A table, because the point is a comparison."], ["Every claim shows its source", "And how sure it is: evidence, inference or assumption."], ["Next steps are buttons", "Two or three specific moves, one click each."]],
};
const notes = (m) => `<ol class="gu-notes" data-pane="${m}">${NOTES[m].map(([t, d], i) => `<li data-pin="${i + 1}"><b>${t}</b><span>${d}</span></li>`).join("")}</ol>`;
const wBefore = words(TEXT[0] + " " + TEXT[1]);
const SCORE = [["Words before the answer", wBefore, 0], ["Claims with a source", 0, 4], ["Next steps, one click away", 0, 3]];
const compare = `<figure class="art live gu" data-live="compare" data-mode="text" aria-label="One cost question answered twice. As plain text, the answer comes last and none of its figures has a source. As generative UI, the answer comes first, a table carries the comparison, each claim has a citation, and the next steps are buttons.">
<div class="gu-top"><p class="gu-q"><span class="gu-av">SR</span>${Q}</p><div class="seg" role="group" aria-label="Answer as"><button type="button" data-mode="text" aria-pressed="true">Plain text</button><button type="button" data-mode="ui" aria-pressed="false">Generative UI</button></div></div>
<div class="gu-body"><div class="gu-ans"><span class="gu-from"><img src="media/logo.png" alt="" width="16" height="16">Escher</span><div class="gu-panes">${textPane}${uiPane}</div></div><div class="gu-side">${notes("text")}${notes("ui")}</div></div>
<div class="gu-score">${SCORE.map(([l, a, b]) => `<div><span>${l}</span><b data-text="${a}" data-ui="${b}">${a}</b><i><em data-k="text">${a}</em> as text · <em data-k="ui">${b}</em> as interface</i></div>`).join("")}</div>
<p class="gu-note">Both answers use the same tool results, from the prototype’s cost story. The plain one is how a text-only assistant would put them.</p></figure>`;

// ── Generative UI 2: built while it streams
const LANG = [
  ["root", 'root = Stack([lead, head, drivers, take, next])'],
  ["lead", 'lead = TextContent("Most of the 31% isn’t real growth.")'],
  ["head", 'head = TextContent("## prod-pool is the only recurring increase")'],
  ["drivers", 'drivers = Table([driver, kind, amount])'],
  ["driver", 'driver = Col("Driver", ["prod-pool", "RI renewal", "S3 transfer"])'],
  ["kind", 'kind = Col("Kind", ["Recurring", "Annual", "One-off"])'],
  ["amount", 'amount = Col("This month", ["$4,218", "$11,400", "6× for 3 days"])'],
  ["take", 'take = TextContent("The honest increase is about $4.2k a month.")'],
  ["next", 'next = FollowUpBlock([f1, f2])'],
  ["f1", 'f1 = FollowUpItem("Right-size prod-pool")'],
  ["f2", 'f2 = FollowUpItem("Set a cost anomaly alert")'],
];
function langHtml(s) {
  const m = s.match(/^(\w+) = (.*)$/);
  const body = esc(m[2])
    .replace(/(&quot;.*?&quot;)/g, (x) => `\u0001${x}\u0002`)
    .replace(/\b([A-Z]\w+)(?=\()/g, '<span class="l-c">$1</span>')
    .replace(/(^|[\[(,\s])([a-z]\w*)(?=[\]),])/g, '$1<span class="l-r">$2</span>')
    .replace(/\u0001(.*?)\u0002/g, '<span class="l-s">$1</span>');
  return `<span class="l-n">${m[1]}</span> = ${body}`;
}
const slot = (k, inner, cls = "") => `<div class="st-slot${cls ? " " + cls : ""}" data-k="${k}"><span class="st-wait">${k}</span><div class="st-fill">${inner}</div></div>`;
const col = (k, head, cells) => `<div class="st-col" data-k="${k}"><span class="st-wait">${k}</span><div class="st-fill"><b>${head}</b>${cells.map((c) => `<span>${c}</span>`).join("")}</div></div>`;
const stream = `<figure class="art live st" data-live="stream2" aria-label="OpenUI Lang streams in on the left. The first line names the five parts of the answer, so its layout exists before any part is written. Each part fills in on the right the moment its line parses.">
<div class="st-grid"><div class="st-code"><p class="st-lab"><span class="st-dot"></span>OpenUI Lang · streaming</p><ol class="st-lines">${LANG.map(([k, s]) => `<li data-k="${k}" style="--n:${s.length}"><code>${langHtml(s)}</code></li>`).join("")}</ol></div>
<div class="st-out"><p class="st-lab"><span data-c="done">0</span> of ${LANG.length} statements · <span data-c="wait">0</span> waiting</p><div class="st-root" data-k="root"><span class="st-wait">root</span>
${slot("lead", '<p class="gu-lead">Most of the 31% isn’t real growth.</p>')}
${slot("head", '<p class="gu-h">prod-pool is the only recurring increase</p>')}
<div class="st-slot st-table" data-k="drivers"><span class="st-wait">drivers</span><div class="st-fill st-cols">${col("driver", "Driver", ["prod-pool", "RI renewal", "S3 transfer"])}${col("kind", "Kind", ['<i class="gu-b red">Recurring</i>', '<i class="gu-b">Annual</i>', '<i class="gu-b">One-off</i>'])}${col("amount", "This month", ["$4,218", "$11,400", "6× for 3 days"])}</div></div>
${slot("take", '<p class="gu-take">The honest increase is about $4.2k a month.</p>')}
<div class="st-slot st-next" data-k="next"><span class="st-wait">next</span><div class="st-fill gu-fu">${slot("f1", `<span>${ic("arrow-right")}Right-size prod-pool</span>`, "chip")}${slot("f2", `<span>${ic("arrow-right")}Set a cost anomaly alert</span>`, "chip")}</div></div></div></div></div>
<button class="replay" type="button">${ic("arrow-counter-clockwise")}Replay</button></figure>`;

// ── Generative UI 4: citations, and who writes a findings card
const kinds = `<div class="ck">${[1, 3, 4].map((n) => {
  const [k, kl, src, what, kv, ts] = CITES[n];
  const why = { ev: "Observed in a named source.", in: "A conclusion drawn from data.", as: "Taken as true, not yet confirmed." }[k];
  return `<div class="ck-i"><p class="ck-h"><span class="gu-c ${k} static">${n}</span><b>${kl}</b><span>${why}</span></p><div class="gu-pop static"><span class="gu-pk ${k}"><i></i>${kl}${src ? ` · ${logo("aws")}${src}` : ""}</span><b>${what}</b>${kv.map(([a, b]) => `<span class="gu-kv"><em>${a}</em>${b}</span>`).join("")}<span class="gu-ts">Data as of ${ts}</span></div></div>`;
}).join("")}</div>`;
const who = `<figure class="art live who" data-live="who" data-on="0" aria-label="A findings card. The headline, the lead and the note on each row are written by the model. The rows themselves, with their severity, resources and count, come from the build_findings tool and cannot be changed by the model.">
<div class="who-top"><div class="seg" role="group" aria-label="Show"><button type="button" data-on="0" aria-pressed="true">The card</button><button type="button" data-on="1" aria-pressed="false">Who wrote it</button></div><p class="who-key"><span class="m">Model</span><span class="t">build_findings tool</span></p></div>
<div class="who-card"><p class="who-m who-hl"><i class="sx-cb"></i><b>2 findings · 1 critical internet exposure</b><em>headline</em></p><p class="who-m who-ld">The bucket is the one to act on today; the Lambda health cluster is worth watching, not fixing.<em>lead</em></p>
${findRows.map(([t, , a, k, kl], i) => `<div class="who-row"><div class="who-t"><i class="sx-cb"></i><span><b>${t}</b><small>${a}</small></span><span class="sx-sev ${k}">${kl}</span><em>row</em></div><p class="who-m who-note">${i ? "Watch, don’t fix: all three share one health signal." : "Anyone on the internet can read every object in it."}<em>note</em></p></div>`).join("")}</div>
<p class="who-cap">The model can’t type a severity, a resource or a count. It writes the framing, and the rows arrive from the tool through React context.</p></figure>`;

// ── Stack, with real logos
const STACK = [
  [["react", "vite"], "React, Vite", "The frontend, shared by the web prototype, the desktop build and the Tauri app."],
  [["anthropic", "openrouter"], "Anthropic, OpenRouter", "Native Messages API for prompt caching, with failover to another model when one is down."],
  [["postgresql"], "Postgres, pgvector", "The estate, findings, reports and alerts, plus embeddings for semantic search."],
  [["pnpm", "turborepo"], "pnpm, Turborepo", "One monorepo for the apps, the design system and the estate store."],
  [["vercel"], "Vercel", "Edge functions, password-gated deploys, share links in Vercel Blob."],
  [["tauri", "electron"], "Tauri, Electron", "The shipping desktop app, and the build that runs the prototype on real accounts."],
];
const stack = `<ul class="stack logos">${STACK.map(([ls, t, d]) => `<li><span class="lgs">${ls.map((l) => logo(l)).join("")}</span><b>${t}</b><span>${d}</span></li>`).join("")}</ul>`;

// ── Architecture and desktop diagrams, with logos on the nodes
const node = (x, y, w, h, t, s, key = false) => `<rect class="${key ? "d-key" : "d-node"}" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/><text class="${key ? "d-key-t" : "d-t"}" x="${x + 20}" y="${y + 32}"${key ? ' font-size="15"' : ""}>${t}</text><text class="${key ? "d-key-t" : "d-s"}" x="${x + 20}" y="${y + 54}"${key ? ' font-size="12" opacity=".7"' : ""}>${s}</text>`;
const logos = (list, x, y, h = 20, gap = 8) => { let out = "", cx = x; for (const l of list.slice().reverse()) { const { vb } = parts(l); const [, , w0, h0] = vb.split(/\s+/).map(Number); const w = (h * w0) / h0; cx -= w; out += logoAt(l, cx.toFixed(1), y, h); cx -= gap; } return out; };
const arch = `<div class="diagram"><svg viewBox="0 0 880 380" role="img" aria-label="The browser's chat controller calls three API routes: chat goes to the models, estate tools go to Postgres with pgvector, and the AWS CLI route goes to the user's AWS accounts. The gen-UI renderer and the Repository sit beside the controller in the browser.">
<text class="d-s" x="0" y="16">Browser</text>${logos(["react", "vite"], 272, 2, 16, 6)}<text class="d-s" x="310" y="16">API</text>${logos(["vercel"], 582, 2, 14)}<text class="d-s" x="620" y="16">Services</text>
<rect class="d-group" x="-12" y="30" width="284" height="340" rx="16"/><rect class="d-group" x="298" y="30" width="284" height="340" rx="16"/><rect class="d-group" x="608" y="30" width="284" height="340" rx="16"/>
${node(0, 46, 260, 76, "Chat controller", "Prompt, tools, up to 3 rounds", true)}${node(0, 158, 260, 76, "Gen-UI renderer", "OpenUI Lang to components")}${node(0, 270, 260, 76, "Repository", "Versioned stores, migrations")}
${node(310, 46, 260, 76, "/api/chat", "Prompt cache, retry, failover")}${node(310, 158, 260, 76, "Estate tools", "Query, graph, semantic search")}${node(310, 270, 260, 76, "AWS CLI", "Read-only, allowlisted")}
${node(620, 46, 260, 76, "Claude, OpenRouter", "Model allowlist")}${logos(["claude", "openrouter"], 862, 60)}${node(620, 158, 260, 76, "Postgres + pgvector", "Estate, findings, embeddings")}${logos(["postgresql"], 862, 172)}${node(620, 270, 260, 76, "AWS accounts", "Every type, every region")}${logos(["aws"], 862, 286, 18)}
<path class="d-line" d="M260 84H310M570 84H620M570 196H620M570 308H620"/><path class="d-line" d="M285 84V308M285 196H310M285 308H310"/><path class="d-line" d="M130 122V158M130 234V270"/></svg></div>`;
const desktop = `<div class="diagram"><svg viewBox="0 0 880 360" role="img" aria-label="Inside the Electron app: the window loads the same web app from a local server, which runs the same API routes against an embedded Postgres and the local AWS CLI. Only model calls leave the laptop.">
<text class="d-s" x="0" y="16">On the laptop</text>${logos(["electron"], 612, 1, 18)}<text class="d-s" x="680" y="16">Network</text>
<rect class="d-group" x="-12" y="30" width="636" height="320" rx="16"/>
${node(0, 46, 290, 76, "Window", "The same web app, unchanged", true)}${logos(["react"], 272, 60, 20)}${node(322, 46, 290, 76, "Local server", "The same API routes, one origin")}
${node(0, 158, 290, 76, "Embedded Postgres", "PGlite with pgvector, in WASM")}${logos(["postgresql"], 272, 172)}${node(322, 158, 290, 76, "AWS CLI, Python, boto3", "Bundled, using local profiles")}${logos(["python"], 594, 172)}
<rect class="d-node" x="0" y="270" width="612" height="64" rx="12"/><text class="d-t" x="20" y="300">OS</text><text class="d-s" x="20" y="320">Keychain for keys · escher:// sign-in links · native alerts · auto-update</text>
${node(680, 46, 200, 76, "Models", "Prompts only")}${logos(["claude"], 862, 60)}${node(680, 158, 200, 76, "AWS APIs", "Your accounts")}${logos(["aws"], 862, 174, 18)}
<path class="d-line" d="M290 84H322M612 84H680M500 122V158M612 196H680"/><path class="d-line" d="M400 122V140H145V158"/></svg></div>`;
const builds = `<div class="cols builds">
<div><span class="n"><span class="lgs">${logo("react")}${logo("vite")}</span>Web prototype</span><h3>Demos and design</h3><p>A made-up estate anyone can explore in a browser.</p></div>
<div><span class="n"><span class="lgs">${logo("electron")}</span>Electron build</span><h3>Real accounts</h3><p>The same app on a laptop, connected to real AWS.</p></div>
<div><span class="n"><span class="lgs">${logo("tauri")}</span>Tauri app</span><h3>The product</h3><p>The shipping desktop app, using this frontend code.</p></div></div>`;
const tokensPipe = `<div class="tp" aria-label="One token file builds CSS variables, a Tailwind theme and typed TypeScript tokens."><span class="tp-src">${ic("file-text")}<b>tokens</b><small>one source file</small></span><i class="tp-ar"></i><span class="tp-outs"><span>${ic("code")}<b>CSS variables</b></span><span>${logo("tailwindcss")}<b>Tailwind theme</b></span><span>${logo("typescript")}<b>Typed tokens</b></span></span><i class="tp-ar"></i><span class="tp-src">${ic("app-window")}<b>Every app</b><small>prototype, desktop, Tauri</small></span></div>`;

// ── One turn: one question played end to end, with what the browser does docked under the screen.
// Styles in turn.css, behaviour in turn.js. Tool names, the 3-round cap, the 14-tool Ask catalog,
// open_report as a captured control tool and the report's own scan_findings run are from the
// prototype (hooks/use-chat-controller.ts, genui/tool-schemas.ts, genui/report-findings.ts).
const TQ = "Are any of our S3 buckets actually public right now?";
// Inline citation pills: {3} is evidence, {3i} an inference.
const tci = (n, k = "e") => `<i class="tj-ci ${k}">${n}</i>`;
// Text that streams in word by word. **x** is bold, {n} a citation stuck to the word before it.
function streamed(s) {
  return s.split(" ").map((w) => `<span class="w">${w
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\{(\d)(i?)\}/g, (_, n, i) => tci(n, i ? "i" : "e"))} </span>`).join("");
}
const CALLS = [
  // key, icon, tool, args, result, badge, seconds, section
  ["c1", "database", "query_resources", 'type: "s3"', "41 buckets in prod", "cached", "0.3s", 1],
  ["c2", "shield-warning", "analyze_posture", 'type: "s3"', "1 flagged: sellers-exports", "1 flagged", "0.7s", 1],
  ["c3", "terminal", "aws_cli", "aws s3api get-bucket-policy --bucket sellers-exports", 's3:GetObject for Principal "*"', "live", "1.1s", 2],
  ["c4", "terminal", "aws_cli", "aws s3api get-public-access-block --bucket sellers-exports", "All 4 block flags are false", "live", "0.9s", 2],
  ["c5", "terminal", "aws_cli", "aws cloudfront list-distributions", "Origin of exports-cdn", "live", "1.4s", 3],
];
const SECS = [
  [1, "Estate inventory", "Start with the estate: count the buckets, then find any with the public-access block off."],
  [2, "Live check", "The estate says one is open. Confirm it against AWS before saying so."],
  [3, "What serves it", "Check what reads from it before suggesting a fix."],
];
const tcard = ([k, i, t, a, r, b, s]) => `<div class="tj-card" data-k="${k}"><span class="tj-ico">${ic(i)}</span><p class="tj-c1"><code>${t}</code><span>${esc(a)}</span></p><span class="tj-dur">${s}</span><i class="tj-st"><b class="tj-spin"></b>${ic("check")}</i><p class="tj-c2">${ic("arrow-right")}<span>${esc(r)}</span><em class="${b === "live" ? "live" : /flag/.test(b) ? "bad" : ""}">${b}</em></p></div>`;
const work1 = `<div class="tj-work" data-k="w1"><p class="tj-wh"><b class="tj-spin"></b>${ic("caret-right", "tj-car")}<b class="tj-wl" data-wl>Working</b><span class="tj-wt" data-wt>0.0s</span><span class="tj-wm">5 calls</span><span class="tj-fresh">${ic("check")}Data fresh</span></p>
<div class="tj-wb"><div class="tj-wbi">${SECS.map(([n, t, th]) => `<div class="tj-sec" data-k="s${n}"><p class="tj-sh">${t}</p><p class="tj-th">${th}</p>${CALLS.filter((c) => c[7] === n).map(tcard).join("")}</div>`).join("")}</div></div></div>`;
const met = (k, l, v, n, c, cls = "") => `<div class="tj-met tj-slot" data-k="${k}"><small>${l}</small><b class="${cls}">${v}${c}</b><span>${n}</span></div>`;
const answer = `<div class="tj-ans" data-k="a1"><span class="tj-from"><img src="media/logo.png" alt="" width="14" height="14">Escher</span>
<p class="tj-lead tj-slot" data-k="lead">${streamed("Yes, one: **sellers-exports**. Its policy lets anyone read every object,{3} and the public-access block that would stop it is off.{4}")}</p>
<div class="tj-mets tj-slot" data-k="stats">${met("m1", "Public buckets", "1 of 41", "in prod", tci(1) + tci(2))}${met("m2", "Public-access block", "Off", "all 4 flags false", tci(4), "bad")}${met("m3", "Served by", "exports-cdn", "CloudFront origin", tci(5))}</div>
<p class="tj-take tj-slot" data-k="take">${streamed("Make it private and let exports-cdn read it through origin access control, rather than delete it.")}</p>
<div class="tj-fu tj-slot" data-k="next">${["Write it up as a report", "Make it private", "Show the policy"].map((t, i) => `<span${i ? "" : ' class="tj-f1"'}>${ic("arrow-right")}${t}</span>`).join("")}</div></div>`;
const work2 = `<div class="tj-work tj-w2" data-k="w2"><p class="tj-wh"><b class="tj-spin"></b>${ic("caret-down", "tj-car")}<b class="tj-wl" data-wl2>Thinking</b></p><div class="tj-card ctl" data-k="c6"><span class="tj-ico">${ic("file-text")}</span><p class="tj-c1"><code>open_report</code><span>title: "S3 exposure review"</span></p><em class="tj-cap">captured, not run</em></div></div>`;
const art = `<div class="tj-art" data-k="art"><span class="tj-ico">${ic("file-text")}</span><span><b>S3 exposure review</b><small>Report · prod · 41 buckets</small></span><em data-art>Writing</em></div>`;
const tside = side("operate", { analysis: [["chat-circle", "Public S3 buckets"], ["chat-circle", "Public exposure in prod"]] })
  .replace(`<li class="on">${ic("note-pencil")}`, `<li class="on tj-nn">${ic("note-pencil")}`)
  .replace(`<li>${ic("chat-circle")}<span>Public S3 buckets</span><small>142d</small>`, `<li class="tj-sess">${ic("chat-circle")}<span>Public S3 buckets</span><b class="tj-pulse"></b><small>now</small>`);
const tdetails = [
  ["circle-dashed", "Status", '<span class="sx-pill">Open</span>'], ["shield", "Severity", '<span class="sx-pill crit">↑ Critical</span>'],
  ["cube", "Resource", "sellers-exports"], ["globe", "Region", "us-east-1"],
  ["tree-structure", "Source", "Public S3 buckets"], ["tag", "Rule", "<code>s3-public-read</code>"],
  ["calendar-blank", "Detected", "May 30 · 4:21 PM"], ["user", "Saved by", '<span class="sx-av sm">SR</span> Sam Rivera'],
];
const report = `<div class="tj-rep" data-k="rep"><div class="tj-repi"><em class="sx-id">#R-1</em><h5>S3 exposure review<span class="sx-pill warn">Warning</span></h5><p class="tj-rsub">prod · 41 buckets · May 30, 2026</p>
<div class="tj-kp"><div class="tj-slot" data-k="rk1"><small>Public buckets</small><b>1 of 41${tci(1)}${tci(2)}</b></div><div class="tj-slot" data-k="rk2"><small>Served by</small><b>exports-cdn${tci(5)}</b></div></div>
<p class="sx-sec">Summary</p><p class="tj-rtext" data-k="rtext">${streamed("sellers-exports lets anyone read its objects,{3} and its public-access block is off.{4} exports-cdn serves it,{5} so make it private behind the CDN rather than delete it.")}</p>
<p class="sx-sec">Findings</p><div class="sx-fc tj-fc tj-slot" data-k="fc"><p class="sx-fc-h tj-m" data-k="fch"><i class="sx-cb"></i><span>1 finding · 1 critical internet exposure</span><em>model</em></p>
<div class="sx-fr tj-t" data-k="frow"><i class="sx-cb"></i><span><b>S3 bucket allows public read</b><small>Affects sellers-exports</small></span><em class="sx-sev crit">Critical</em><span class="sx-btn tj-save">${ic("bookmark-simple")}Save</span><span class="sx-saved tj-saved">${ic("check")}Saved</span><em class="tj-tag">scan_findings</em></div>
<p class="tj-note tj-m" data-k="fnote"><span>Public access block disabled leaves bucket contents open to anonymous read until re-enabled.</span><em>model</em></p></div></div></div>`;
const finding = `<div class="tj-fnd" data-k="fnd"><em class="sx-id">#ufnd_xysj</em><h5>S3 bucket allows public read</h5><p class="sx-desc">With the public-access block off, anyone on the internet can read every object in sellers-exports.</p>
<p class="sx-sec">Evidence <span>${ic("arrow-up-right")}Open all</span></p><div class="sx-ev">${["Bucket policy", "Public access block", "CloudFront origin"].map((t) => `<span>${logo("aws")}${t}${ic("arrow-up-right", "dim")}</span>`).join("")}</div>
<p class="sx-sec">Details ${ic("caret-down")}</p><dl class="sx-dl">${tdetails.map(([i, k, v]) => `<div><dt>${ic(i)}${k}</dt><dd>${v}</dd></div>`).join("")}</dl></div>`;
const tscreen = fit(
  tside +
  `<div class="sx-main tj-main"><div class="tj-home on" data-k="home"><span class="sx-btn sx-art">${ic("sidebar-simple")}Artifacts</span><div class="sx-grid"></div>
<div class="sx-hc"><h4 class="sx-hi">Good afternoon, <i>Sam</i></h4><div class="sx-comp big tj-comp"><span class="sx-ph" data-ph="What can I help you investigate?">What can I help you investigate?</span><div class="sx-row">${ic("plus")}${scope}${ic("caret-down", "dim")}<span class="sx-sp"></span><span class="sx-seg"><span class="on">${ic("chat-text")}Ask</span><span>${ic("wrench")}Execute</span></span><span class="sx-send dark tj-send">${ic("paper-plane-tilt")}</span></div></div>
<ul class="sx-sug tj-sug">${PROMPTS.slice(1, 4).map((p) => `<li>${p}${ic("arrow-up-right")}</li>`).join("")}</ul></div></div>
<div class="tj-thread" data-k="thread"><p class="sx-bar tj-bar">${ic("chat-circle")}<b>Public S3 buckets</b>${scope}</p><div class="tj-view"><div class="tj-col">
<p class="sx-u tj-u" data-k="u1">${TQ}</p>${work1}${answer}<p class="sx-u tj-u" data-k="u2">Write it up as a report.</p>${work2}${art}</div></div>${composer("Ask a follow-up…")}</div>
<div class="sx-canvas tj-canvas" data-k="canvas"><p class="sx-cbar"><span class="sx-tab tj-tab" data-tab="rep">${ic("file-text")}Report</span><span class="sx-tab tj-tab" data-tab="fnd" data-k="ftab">${ic("lightbulb")}Finding</span><span class="sx-sp"></span><span class="sx-btn">${ic("download-simple")}Export</span>${ic("arrows-out-simple", "dim")}</p><div class="sx-doc">${report}${finding}</div></div>
<svg class="tj-cur" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2.5v17.2l4.6-4.4 3 6.9 3.1-1.3-3-6.8h6.4z"/></svg></div>`,
  { label: "One turn in Escher, played through: the question is typed and sent, five read-only tool calls run in three rounds, the answer streams in as cards, a report is written in a second pass, and its finding is saved.", fx: 244 }
);

// What the browser does at each step, docked under the screen.
const DATA_TOOLS = ["query_estate", "query_resources", "query_findings", "scan_findings", "analyze_posture", "build_findings", "search_knowledge", "query_reports", "aws_cli"];
const CTL_TOOLS = ["open_report", "create_plan", "create_changeset", "run_execution", "ask_user"];
const kv = (k, name, val, note = "") => `<p class="tj-kv" data-k="${k}"><span>${name}</span><code>${val}</code>${note}</p>`;
const pReq = `<div class="tj-dp tj-req" data-p="0"><p class="tj-empty" data-k="empty">Nothing sent yet</p><div class="tj-kvs">${kv("r1", "POST", "/api/chat")}${kv("r2", "model", "claude-opus-5-5")}${kv("r3", "system", "chat rules + gen-UI grammar", `<em class="ok">${ic("lightning")}cache hit</em>`)}${kv("r4", "scope", "prod", "<em>frozen for the turn</em>")}${kv("r5", "rounds", "up to 3")}</div>
<div class="tj-tools"><p class="tj-dh" data-k="th">Tools <b>14</b></p><div class="tj-chips">${DATA_TOOLS.map((t, i) => `<code data-k="t${i}">${t}</code>`).join("")}${CTL_TOOLS.map((t, i) => `<code class="c" data-k="t${i + DATA_TOOLS.length}">${t}</code>`).join("")}</div>
<p class="tj-leg" data-k="leg"><span><i></i>runs, returns data</span><span><i class="c"></i>captured, never run</span><span class="off"><s>propose_change</s> <s>run_steps</s> not sent in Ask</span></p></div></div>`;
const TEND = 8;
const WF = [
  ["model", "", [[0, 1.2], [1.9, 3.1], [4.2, 5.4]], [6.8, TEND], ""],
  ["query_resources", 'type: "s3"', [[1.2, 1.5]], null, "41 buckets"],
  ["analyze_posture", 'type: "s3"', [[1.2, 1.9]], null, "1 flagged"],
  ["aws_cli", "get-bucket-policy", [[3.1, 4.2]], null, 'Principal "*"'],
  ["aws_cli", "get-public-access-block", [[3.1, 4.0]], null, "4 flags false"],
  ["aws_cli", "cloudfront list-distributions", [[5.4, 6.8]], null, "exports-cdn"],
];
const ROUNDS = [[1.2, 1.9], [3.1, 4.2], [5.4, 6.8]];
const pct = (s) => ((s / TEND) * 100).toFixed(2) + "%";
const bar = ([a, b], cls) => `<i class="tj-wbar ${cls}" data-a="${a}" data-b="${b}" style="left:${pct(a)};width:${pct(b - a)}"></i>`;
const pLoop = `<div class="tj-dp tj-loop" data-p="1"><div class="tj-wf"><div class="tj-wfh"><span class="tj-key"><i class="think"></i>model<i class="call"></i>call<i class="ans"></i>answer</span><span class="tj-trk">${ROUNDS.map(([a, b], i) => `<em class="tj-rd" data-k="rd${i}" style="left:${pct(a)}"><span>Round </span>${i + 1}</em>`).join("")}</span></div>
${WF.map(([t, a, bars, ans, out], i) => `<div class="tj-wr${i ? "" : " model"}"><span class="tj-wfl"><code>${t}</code>${a ? `<span>${esc(a)}</span>` : ""}</span><span class="tj-trk">${ROUNDS.map(([a0, b0], r) => `<i class="tj-band" data-a="${a0}" style="left:${pct(a0)};width:${pct(b0 - a0)}"></i>`).join("")}${bars.map((b) => bar(b, i ? "call" : "think")).join("")}${ans ? bar(ans, "ans") : ""}${out ? `<span class="tj-out" data-at="${bars[0][1]}" style="left:calc(${pct(bars[0][1])} + 6px)">${esc(out)}</span>` : ""}</span></div>`).join("")}
<div class="tj-wff"><span></span><span class="tj-trk">${[0, 2, 4, 6, 8].map((s) => `<small style="left:${pct(s)}">${s}s</small>`).join("")}</span></div><i class="tj-ph" data-playhead></i></div><p class="tj-argv"><span>Each aws_cli call runs as an argument list, with no shell:</span><code>["aws", "s3api", "get-bucket-policy", "--bucket", "sellers-exports", "--profile", "prod"]</code></p></div>`;
const LANG2 = [
  ["root", "root = Stack([lead, stats, take, next])"],
  ["lead", 'lead = TextContent("Yes, one: sellers-exports. Its policy lets…")'],
  ["stats", 'stats = Stack([m1, m2, m3], "row")'],
  ["m1", 'm1 = Metric("Public buckets", "1 of 41", null, null, null, "in prod")'],
  ["m2", 'm2 = Metric("Public-access block", "Off", null, null, "bad")'],
  ["m3", 'm3 = Metric("Served by", "exports-cdn")'],
  ["take", 'take = TextContent("Make it private and let exports-cdn…")'],
  ["next", 'next = FollowUpBlock([FollowUpItem("Write it up as a report"), …])'],
];
const pStream = `<div class="tj-dp tj-strm" data-p="2"><ol class="tj-lang">${LANG2.map(([k, s]) => `<li data-k="l-${k}" style="--n:${s.length}"><code>${langHtml(s)}</code></li>`).join("")}</ol>
<div class="tj-sn"><p class="tj-big"><b data-sc>0</b><span>of ${LANG2.length} statements</span></p><p class="tj-dn">The first line names four parts, so the layout is on screen before any of them is written. Each part fills in when its line parses.</p></div></div>`;
const pPass = `<div class="tj-dp tj-pass" data-p="3"><div class="tj-pp"><div class="tj-pc" data-k="pc1"><p class="tj-pch"><b>Pass 1</b><span>chat</span></p>${kv("", "tools", "14")}${kv("", "calls", "5 run")}${kv("pc1c", "open_report", "captured, never run")}</div>
<div class="tj-pa" data-k="pa"><span>5 tool results</span><i></i></div>
<div class="tj-pc p2" data-k="pc2"><p class="tj-pch"><b>Pass 2</b><span>report</span></p>${kv("", "tools", "none", "")}${kv("", "context", "5 tool results")}${kv("", "writes", "S3 exposure review")}</div></div>
<p class="tj-dn">Pass 2 has nothing it can call, so the report can only use what pass 1 found.</p></div>`;
const JSONL = ['{', '  "fingerprint": "s3-public-read:sellers-exports",', '  "ruleSlug": "s3-public-read",', '  "resourceId": "sellers-exports",', '  "severity": "critical",', '  "count": 1', '}'];
const jsonHtml = (l) => esc(l).replace(/(&quot;[a-zA-Z]+&quot;)(:)/, '<span class="l-r">$1</span>$2').replace(/: (&quot;.*?&quot;)/, ': <span class="l-s">$1</span>').replace(/: (\d+)/, ': <span class="l-c">$1</span>');
const pRec = `<div class="tj-dp tj-rec" data-p="4"><div class="tj-json"><p class="tj-dh"><code>scan_findings</code><span>run by the app, no model call</span></p><ol>${JSONL.map((l, i) => `<li data-k="j${i}"><code>${jsonHtml(l)}</code></li>`).join("")}</ol></div>
<div class="tj-whos"><p class="tj-who" data-k="wh1"><i class="t"></i><span><b>Rows</b>From the scan. The model can’t type a severity, a resource or a count.</span></p><p class="tj-who" data-k="wh2"><i class="m"></i><span><b>Headline and notes</b>From the model, keyed to each row’s fingerprint.</span></p>
<p class="tj-log" data-k="log">${ic("check")}<span>Saved to the findings store</span><code>ufnd_xysj</code></p></div></div>`;
const STEPS_T = [
  ["Compose", "The browser builds the prompt and the list of tools the model may call.", "Request"],
  ["Gather", "The model queries the estate, searches it and runs read-only AWS commands, up to three rounds.", "Tool loop"],
  ["Answer", "The reply streams back as OpenUI Lang and renders as cards, tables and charts.", "Stream"],
  ["Second pass", "A report or plan opens as its own pass, so the write-up only uses facts already found.", "Pass 2"],
  ["Record", "Findings are created from tool results, never from the model’s prose.", "Record"],
];
const turn = `<figure class="tj" data-live="turn" data-step="0"><div class="tj-stage"><div class="tj-win">${tscreen}
<div class="tj-dev"><div class="tj-dbar"><span class="tj-rec-dot"></span><span class="tj-dt">${STEPS_T.map(([, , d], i) => `<b data-i="${i}">${i + 1} · ${d}</b>`).join("")}</span><span class="sx-sp"></span><span class="tj-ds" data-ds aria-live="off"></span><button type="button" class="tj-pp-btn" data-pause aria-label="Pause">${ic("pause")}${ic("play")}</button></div>
<div class="tj-dps">${pReq}${pLoop}${pStream}${pPass}${pRec}</div></div></div></div>
<ol class="steps tj-steps">${STEPS_T.map(([t, d], i) => `<li><button type="button" data-i="${i}"${i ? "" : ' aria-current="step"'}><span class="tj-pg"><i></i></span><span class="n">${i + 1}</span><b>${t}</b><span>${d}</span></button></li>`).join("")}</ol></figure>`;

// ── Plan and execute: from a finding to a verified fix, with what runs underneath docked under the
// screen. Same parts as One turn (turn.css), plus run.css; played by run.js. ask_user, create_plan,
// create_changeset, the approval gate and the playbook are the prototype's; this story's numbers are
// the seeded S3 exposure (sellers-exports, exports-cdn, batch, 41 buckets, playbook run 34 times).
const R_CALLS = [
  ["x1", "tree-structure", "query_estate", "readers of sellers-exports", "2 readers: exports-cdn, batch", "graph", "0.4s"],
  ["x2", "terminal", "aws_cli", "aws cloudfront get-distribution-config --id E2K4QX9V", "Origin is the public S3 URL", "live", "0.9s"],
  ["x3", "tree-structure", "query_estate", "blast radius of 3 options", "2, 41 and 3 resources", "graph", "0.6s"],
];
const rwork = (k, label, calls, meta) => `<div class="tj-work" data-k="${k}"><p class="tj-wh"><b class="tj-spin"></b>${ic("caret-right", "tj-car")}<b class="tj-wl" data-wl="${k}">${label}</b><span class="tj-wm">${meta}</span></p><div class="tj-wb"><div class="tj-wbi tx-wbi">${calls}</div></div></div>`;
const ctl = (k, t, a, cap = "captured, not run") => `<div class="tj-card ctl" data-k="${k}"><span class="tj-ico">${ic("flow-arrow")}</span><p class="tj-c1"><code>${t}</code><span>${esc(a)}</span></p><em class="tj-cap">${cap}</em></div>`;
const OPTS = [
  ["o1", "Make it private behind the CDN", "Block public access and let exports-cdn read through origin access control.", [["2 resources", ""], ["Low risk", "ok"], ["Reversible", ""], ["Playbook · 34 runs", ""]], true],
  ["o2", "Block public access for the account", "Closes every bucket in prod, including two that serve public assets.", [["41 resources", "bad"], ["High risk", "bad"], ["Reversible", ""]]],
  ["o3", "Delete the bucket", "Removes the exports and breaks exports-cdn and batch.", [["3 resources", "bad"], ["Can’t undo", "bad"]]],
];
const QS = [
  ["q1", "Should exports-cdn keep serving these files?", ["Yes, through origin access control", "No, take it offline"], "exports-cdn: keep, through origin access control"],
  ["q2", "When should it run?", ["Now", "Next change window · Sat 02:00"], "Run: now"],
  ["q3", "Who should hear about it?", ["#seller-platform on Slack", "Nobody"], "Tell: #seller-platform"],
];
const askCard = `<div class="tx-askc" data-k="askc"><p class="tx-ah"><span class="tx-aq">${ic("chat-text")}</span><b>A few questions before I plan</b><span class="tx-an"><b data-qn>1</b> of 3</span></p>
<ul class="tx-done">${QS.map(([k, , , sum]) => `<li data-k="${k}d">${ic("check")}<span>${sum}</span></li>`).join("")}</ul>
${QS.map(([k, q, opts]) => `<div class="tx-q" data-k="${k}"><p>${q}</p>${opts.map((o, i) => `<span class="tx-qo" data-q="${k}" data-o="${i}"><kbd>${i + 1}</kbd>${o}</span>`).join("")}<span class="tx-qo other"><kbd>${ic("pencil-simple-line")}</kbd>Something else…</span></div>`).join("")}</div>`;
const opts = `<div class="tx-opts tj-slot" data-k="opts"><p class="tx-oh">Three ways to fix it</p>${OPTS.map(([k, t, d, meta, rec]) => `<div class="tx-opt" data-k="${k}"><i class="tx-radio">${ic("check")}</i><div><p><b>${t}</b>${rec ? '<em class="tx-rec">Recommended</em>' : ""}</p><p>${d}</p><p class="tx-meta">${meta.map(([m, c]) => `<span class="${c}">${m}</span>`).join("")}</p></div></div>`).join("")}</div>`;
const readers = `<div class="tx-rdrs tj-slot" data-k="rdrs">${[["aws-cloudfront", "exports-cdn", "CloudFront", "Reads over the public URL", "Breaks", "bad"], ["aws-ec2", "batch", "EC2", "Reads through its IAM role", "Unaffected", "ok"]].map(([l, n, ty, how, st, c]) => `<div class="tx-rdr">${logo(l)}<span><b>${n}</b><small>${ty} · ${how}</small></span><em class="${c}">${st}</em></div>`).join("")}</div>`;
const rthread = `<div class="tj-thread tx-thread on"><p class="sx-bar tj-bar">${ic("play")}<em>F-1</em><b>Fix sellers-exports</b>${scope}</p><div class="tj-view"><div class="tj-col">
<div class="tx-empty"><span>${ic("lightbulb")}</span><b>Start from the finding</b><small>Ask about it, or plan a fix.</small></div>
<div class="sx-u tj-u tx-u1" data-k="u1"><span class="tx-att">${ic("lightbulb")}F-1 · S3 bucket allows public read</span>What breaks if we close it?</div>
${rwork("w1", "Working", R_CALLS.slice(0, 2).map(tcard).join(""), "2 calls")}
<div class="tj-ans" data-k="a1"><span class="tj-from"><img src="media/logo.png" alt="" width="14" height="14">Escher</span><p class="tj-lead tx-lead" data-k="l1">${streamed("Two things read sellers-exports, and closing it outright breaks one of them.{1}")}</p>${readers}
<div class="tj-fu tj-slot" data-k="fu1"><span class="tx-fplan">${ic("arrow-right")}Plan a fix</span><span>${ic("arrow-right")}Show the policy</span></div></div>
<p class="sx-u tj-u" data-k="u2">Plan a fix.</p>
${rwork("w2", "Working", tcard(R_CALLS[2]), "1 call")}
<div class="tj-ans" data-k="a2">${opts}</div>
<p class="sx-u tj-u" data-k="u3">Make it private behind the CDN.</p>
<div class="sx-u tj-u tx-u4" data-k="u4">${QS.map(([, , , sum]) => `<span>${sum}</span>`).join("")}</div>
${rwork("w3", "Planning", ctl("x4", "create_plan", 'option: "private behind the CDN"'), "")}
<div class="tj-art tx-art" data-k="art1"><span class="tj-ico">${ic("flow-arrow")}</span><span><b>Make sellers-exports private</b><small>Plan · 5 steps · low risk</small></span><em>Ready</em></div>
<div class="tj-ans" data-k="a3"><p class="tj-take" data-k="l3">${streamed("exports-cdn gets read access in step 3, before the block goes on in step 4, so seller downloads never stop.")}</p><div class="tj-fu tj-slot" data-k="fu3"><span class="tx-fcs">${ic("arrow-right")}Prepare the change set</span></div></div>
<p class="sx-u tj-u" data-k="u5">Prepare the change set.</p>
${rwork("w4", "Thinking", ctl("x5", "create_changeset", 'plan: "P-1"'), "")}
<div class="tj-art tx-art" data-k="art2"><span class="tj-ico">${ic("code")}</span><span><b>5 files · +27 −1</b><small>Change set · 3 from the playbook, 2 new</small></span><em data-cs>Review</em></div>
<div class="sx-gate tx-gate" data-k="gate"><p>${ic("lock-simple")}<span><b>Run 5 steps on sellers-exports?</b><small data-gs>Dry run it first.</small></span></p><p><span class="sx-btn tx-dryb">${ic("play")}Dry run</span><span class="sx-btn dark tx-go">Approve and run</span></p></div>
<div class="tx-runc" data-k="runc"><span class="tj-ico">${ic("play")}</span><span><b data-rc>Running step 1 of 5</b><i class="tx-rbar"><i data-rb></i></i></span></div>
<div class="tj-ans" data-k="a4"><p class="tj-take" data-k="l4">${streamed("Done, and checked. sellers-exports is private, exports-cdn still serves files, and F-1 is resolved.")}</p><span class="tx-slack tj-slot" data-k="slack">${logo("slack")}Posted to <b>#seller-platform</b></span></div>
</div></div>
<div class="sx-comp tx-comp"><span class="tx-att sm" data-k="att">${ic("lightbulb")}F-1</span><span class="sx-ph" data-ph="Ask about this finding…">Ask about this finding…</span><span class="sx-send dark tx-send">${ic("paper-plane-tilt")}</span></div>${askCard}</div>`;

// Canvas: the finding, then the plan, the change set and the run.
const R_STEPS = [
  ["Snapshot the policy and ACL", "playbook", "1.1s"],
  ["Create origin access control", "new", "3.2s"],
  ["Let exports-cdn read the bucket", "new", "1.3s"],
  ["Turn on the public access block", "playbook", "2.7s", true],
  ["Remove the wildcard grant", "playbook", "1.4s"],
];
const PARAMS = [["bucket", "sellers-exports"], ["distribution", "exports-cdn · E2K4QX9V"], ["region", "us-east-1"], ["profile", "prod"], ["snapshot", "s3://escher-artifacts/P-1/"], ["notify", "#seller-platform"]];
const R_FILES = [
  ["01-snapshot-policy.py", "+3", "", "playbook", ['policy = s3.get_bucket_policy(Bucket="sellers-exports")', 'acl = s3.get_bucket_acl(Bucket="sellers-exports")', 'write_json(SNAPSHOT + "before.json", {"policy": policy, "acl": acl})']],
  ["02-create-oac.py", "+9", "", "new", ["oac = cloudfront.create_origin_access_control(", "    OriginAccessControlConfig={", '        "Name": "sellers-exports-oac",', '        "OriginAccessControlOriginType": "s3",', '        "SigningBehavior": "always",', '        "SigningProtocol": "sigv4",', "    }", ")", 'attach_oac(distribution="E2K4QX9V", origin="sellers-exports", oac=oac["Id"])']],
  ["03-allow-cdn-read.py", "+7", "", "new", ["add_statement(bucket=\"sellers-exports\", statement={", '    "Effect": "Allow",', '    "Principal": {"Service": "cloudfront.amazonaws.com"},', '    "Action": "s3:GetObject",', '    "Resource": "arn:aws:s3:::sellers-exports/*",', '    "Condition": {"StringEquals": {"AWS:SourceArn": DISTRIBUTION_ARN}},', "})"]],
  ["04-enable-pab.py", "+7", "", "playbook", ["s3.put_public_access_block(", '    Bucket="sellers-exports",', "    PublicAccessBlockConfiguration={", '        "BlockPublicAcls": True, "IgnorePublicAcls": True,', '        "BlockPublicPolicy": True, "RestrictPublicBuckets": True,', "    },", ")"]],
  ["05-strip-wildcard-grant.py", "+1", "−1", "playbook", ['{"Effect": "Allow", "Principal": "*", "Action": "s3:GetObject", …}', "# wildcard GetObject statement removed from the bucket policy"]],
];
const rcode = R_FILES.map(([, , d, , lines], fi) => `<ol class="sx-code tx-code" data-file="${fi}">${lines.map((l, i) => { const del = d && i === 0; return `<li class="${del ? "del" : "add"}"><span>${del ? "−" : "+"}</span><code>${pyLine(l)}</code></li>`; }).join("")}</ol>`).join("");
const DRY = [["2", "CloudFront", "+ origin access control sellers-exports-oac"], ["3", "Bucket policy", "+ allow cloudfront.amazonaws.com, exports-cdn only"], ["4", "Access block", "4 flags false → true"], ["5", "Bucket policy", "− allow Principal \"*\""]];
const VERIFY = [
  ["v1", "Public access block", "All 4 flags true", "s3api get-public-access-block"],
  ["v2", "Anonymous read", "403 AccessDenied", "curl -I sellers-exports.s3.amazonaws.com/…"],
  ["v3", "exports-cdn", "200 OK through CloudFront", "curl -I exports-cdn/latest.csv"],
  ["v4", "Posture", "0 public buckets in prod", "analyze_posture type: s3"],
];
const fndView = `<div class="tx-view tx-fnd" data-v="fnd"><div class="tx-vi"><p class="tx-fbar"><em class="sx-id">#ufnd_xysj</em><span class="sx-sp"></span><span class="sx-btn tx-askb">${ic("chat-circle")}Ask</span><span class="sx-btn">${ic("wrench")}Resolve</span></p><h5>S3 bucket allows public read</h5><p class="sx-desc">With the public-access block off, anyone on the internet can read every object in sellers-exports.</p>
<p class="sx-sec">Evidence</p><div class="sx-ev">${["Bucket policy", "Public access block", "CloudFront origin"].map((t) => `<span>${logo("aws")}${t}${ic("arrow-up-right", "dim")}</span>`).join("")}</div>
<p class="sx-sec">Details</p><dl class="sx-dl tx-dl"><div><dt>${ic("circle-dashed")}Status</dt><dd><span class="sx-pill tx-st"><span>Open</span><span>${ic("check")}Resolved</span></span></dd></div>${[["shield", "Severity", '<span class="sx-pill crit">↑ Critical</span>'], ["cube", "Resource", "sellers-exports"], ["globe", "Region", "us-east-1"], ["tag", "Rule", "<code>s3-public-read</code>"], ["tree-structure", "Source", "Public S3 buckets"]].map(([i, k, v]) => `<div><dt>${ic(i)}${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
<p class="tx-resv" data-k="resv">${ic("check")}<span>Resolved by run E-1 · 4 checks attached as evidence</span></p></div></div>`;
const planV = `<div class="tx-view tx-plan" data-v="plan"><div class="tx-vi"><em class="sx-id">#P-1</em><h5>Make sellers-exports private behind exports-cdn</h5><p class="sx-desc">From the S3 block public access playbook (34 runs, no failures), plus two new steps for origin access control.</p>
<div class="tx-ps" data-k="ps"><p class="sx-sec">Steps <span>runs top to bottom</span></p><ol class="tx-psteps">${R_STEPS.map(([t, src, , ask], i) => `<li data-k="ps${i}"><span>${i + 1}</span><b>${t}</b>${ask ? `<em class="tx-askq">${ic("hand-pointing")}asks first</em>` : ""}<em class="tx-src ${src}">${src}</em></li>`).join("")}</ol></div>
<div class="tx-pp" data-k="pp"><p class="sx-sec">Parameters</p><dl class="tx-params">${PARAMS.map(([k, v], i) => `<div data-k="pp${i}"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></div>
<div class="tx-pb" data-k="pb"><p class="sx-sec">Blast radius</p><div class="tx-imp"><div><small>Resources</small><b>2</b></div><div><small>Risk</small><b class="ok">Low</b></div><div><small>Rollback</small><b>Step 1 snapshot</b></div></div>
<div class="tx-graph"><div class="tx-gn net" data-k="g0">${ic("globe")}<b>Public internet</b><em class="bad">loses access</em></div><i class="tx-ge bad" data-k="g1"></i><div class="tx-gn tgt" data-k="g2">${logo("aws-s3")}<b>sellers-exports</b><small>S3</small></div><div class="tx-gr"><div class="tx-gx" data-k="g3"><i class="tx-ge ok"></i><div class="tx-gn">${logo("aws-cloudfront")}<b>exports-cdn</b><em class="ok">keeps access</em></div></div><div class="tx-gx" data-k="g4"><i class="tx-ge"></i><div class="tx-gn">${logo("aws-ec2")}<b>batch</b><em>unaffected</em></div></div></div></div></div></div></div>`;
const csV = `<div class="tx-view tx-cs" data-v="cs"><div class="tx-vi"><p class="tx-csh"><em class="sx-id">#C-1</em><b>5 files</b><span class="add">+27</span><span class="del">−1</span><span class="sx-sp"></span><span class="tx-revn"><b data-rv>0</b> of 2 new files reviewed</span></p>
<div class="tx-csb"><div class="tx-files">${R_FILES.map(([f, a, d, src], i) => `<p class="tx-file" data-k="f${i}" data-f="${i}">${logo("python")}<span>${f.replace(/\.py$/, "")}</span><span class="add">${a}</span>${d ? `<span class="del">${d}</span>` : ""}${src === "new" ? `<i class="tx-rv" title="needs review">${ic("check")}</i>` : `<i class="tx-pbk">${ic("books")}</i>`}</p>`).join("")}</div>
<div class="tx-srcp"><p class="tx-srch">${logo("python")}<b data-fname>${R_FILES[0][0]}</b><em data-fsrc>playbook</em></p>${rcode}</div></div>
<div class="tx-dry" data-k="dry"><p class="tx-dh">${ic("play")}<b>Dry run</b><span>reads live state, writes nothing</span></p>${DRY.map(([n, w, c], i) => `<p class="tx-dr" data-k="d${i}"><span>${n}</span><b>${w}</b><code>${esc(c)}</code></p>`).join("")}<p class="tx-dok" data-k="dok">${ic("check")}No errors · 2 resources change · exports-cdn keeps access</p></div></div></div>`;
const runV = `<div class="tx-view tx-run" data-v="run"><div class="tx-vi"><em class="sx-id">#E-1</em><h5>Make sellers-exports private<span class="sx-pill tx-rst"><span>Running</span><span>${ic("check")}Done</span></span></h5>
<ol class="sx-run tx-rsteps">${R_STEPS.map(([t, , s], i) => `<li data-s="${i}"><span class="sx-rn">${i + 1}</span><span><b>${t}</b></span><code>${s}</code><i class="sx-ok">${ic("check")}</i></li>${i === 3 ? `<li class="tx-conf" data-k="conf"><span>${ic("hand-pointing")}</span><span>Step 4 closes public access. Continue?</span><span class="sx-btn">Stop run</span><span class="sx-btn dark tx-cont">Continue</span></li>` : ""}`).join("")}</ol>
<div class="tx-vf" data-k="vf"><p class="sx-sec">Verification <span>fresh reads, not the steps’ own output</span></p>${VERIFY.map(([k, t, r, c]) => `<div class="tx-v" data-k="${k}"><i class="tx-vs"><b class="tj-spin"></b>${ic("check")}</i><span><b>${t}</b><small>${esc(c)}</small></span><em>${r}</em></div>`).join("")}</div>
<p class="tx-resv" data-k="vres">${ic("check")}<span>F-1 resolved · sellers-exports is private</span></p></div></div>`;
const rcanvas = `<div class="sx-canvas tj-canvas tx-canvas on" data-view="fnd"><p class="sx-cbar">${[["fnd", "lightbulb", "Finding"], ["plan", "flow-arrow", "Plan"], ["cs", "code", "Change set"], ["run", "play", "Run"]].map(([k, i, t]) => `<span class="sx-tab tx-tab" data-tab="${k}"${k === "fnd" ? "" : ` data-k="tab-${k}"`}>${ic(i)}${t}</span>`).join("")}<span class="sx-sp"></span>${ic("arrows-out-simple", "dim")}</p><div class="sx-doc">${fndView}${planV}${csV}${runV}</div></div>`;
const rside = side("operate", { active: "none", analysis: [["chat-circle", "Public S3 buckets", true]], executions: [["play", "Fix sellers-exports", false, "F-1"]] })
  .replace(`<li class="on">${ic("chat-circle")}<span>Public S3 buckets</span>`, `<li class="on tx-prev">${ic("chat-circle")}<span>Public S3 buckets</span>`)
  .replace(`<li>${ic("play")}<em>F-1</em><span>Fix sellers-exports</span><small>142d</small>`, `<li class="tj-sess">${ic("play")}<em>F-1</em><span>Fix sellers-exports</span><b class="tj-pulse"></b><small>now</small>`)
  .replace('Executions ' + ic("caret-right"), 'Executions ' + ic("caret-down"));
const rscreen = fit(
  rside + `<div class="sx-main tj-main tx-main">${rthread}${rcanvas}<svg class="tj-cur" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2.5v17.2l4.6-4.4 3 6.9 3.1-1.3-3-6.8h6.4z"/></svg></div>`,
  { label: "Fixing a finding in Escher, played through: a question about the finding, three ways to fix it, three questions back, a plan with its parameters and blast radius, a reviewed and dry-run change set, an approved run, and fresh reads that confirm the fix.", fx: 244 }
);

// Underneath, one panel per step.
const pAsk = `<div class="tj-dp tx-pask" data-p="0"><p class="tj-empty" data-k="r-empty">Nothing sent yet</p><div><p class="tj-dh">Sent with the question</p>${kv("r-0", "finding", "ufnd_xysj")}${kv("r-1", "rule", "s3-public-read")}${kv("r-2", "resource", "sellers-exports")}${kv("r-3", "evidence", "3 items")}${kv("r-4", "scope", "prod", "<em>frozen for the session</em>")}</div>
<div><p class="tj-dh" data-k="r-gh">Estate graph</p>${[["exports-cdn", "public URL"], ["batch", "IAM role batch-runner"]].map(([a, how], i) => `<p class="tx-edge" data-k="r-e${i}"><code>${a}</code><i></i><span>reads</span><i></i><code>sellers-exports</code><em>${how}</em></p>`).join("")}<p class="tj-dn" data-k="r-n">Asking from a finding sends the record with the question, so the answer starts from it.</p></div></div>`;
const pOpts = `<div class="tj-dp tx-popt" data-p="1"><table class="tx-tbl"><thead><tr><th>Option</th><th>Resources</th><th>Undo</th><th>Track record</th></tr></thead><tbody>${[["Private behind the CDN", "2", "yes", "playbook · 34 runs, 0 failed"], ["Account-wide block", "41", "yes", "none"], ["Delete the bucket", "3", "no", "none"]].map((r, i) => `<tr data-k="t-${i}">${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table><p class="tj-dn" data-k="t-n">Blast radius is a walk of the estate graph, not a guess by the model. The model writes the options; the numbers come from the tool.</p></div>`;
const pQs = `<div class="tj-dp tx-pqs" data-p="2"><div><p class="tj-dh"><code>ask_user</code><span>the turn waits for answers</span></p>${QS.map(([k, q, o], i) => `<p class="tx-qrow" data-k="a-${i}"><code>${["cdn", "when", "notify"][i]}</code><span>${q}</span><em data-k="a-${i}a">${esc(o[0].split(" · ")[0].replace(" on Slack", ""))}</em></p>`).join("")}</div>
<div><p class="tj-dh" data-k="a-lh">Looked up, not asked</p>${[["Who reads the bucket", "estate graph"], ["How batch reads it", "IAM role"], ["Has this fix worked before", "34 playbook runs"]].map(([q, src], i) => `<p class="tx-look" data-k="a-l${i}">${ic("check")}<span>${q}</span><em>${src}</em></p>`).join("")}</div></div>`;
const PLANJ = ['"steps": [', '  { "n": 1, "source": "playbook", "id": "snapshot-policy" },', '  { "n": 2, "source": "generated", "id": "create-oac" },', '  { "n": 3, "source": "generated", "id": "allow-cdn-read" },', '  { "n": 4, "source": "playbook", "id": "enable-pab", "gate": "ask" },', '  { "n": 5, "source": "playbook", "id": "strip-wildcard" }', '],', '"rollback": "restore:step-1"'];
const pPlan = `<div class="tj-dp tx-pplan" data-p="3"><div class="tj-json"><p class="tj-dh"><code>create_plan</code><span>captured, then written in its own pass</span></p><ol>${PLANJ.map((l, i) => `<li data-k="p-${i}"><code>${jsonHtml(l)}</code></li>`).join("")}</ol></div>
<div class="tx-pk">${kv("p-k0", "steps", "5", "<em>3 playbook, 2 new</em>")}${kv("p-k1", "gate", "step 4", "<em>asks before it runs</em>")}${kv("p-k2", "order", "3 before 4", "<em>exports-cdn never loses access</em>")}${kv("p-k3", "rollback", "step 1 snapshot")}${kv("p-k4", "blast", "2 resources", "<em>from the estate graph</em>")}</div></div>`;
const pCs = `<div class="tj-dp tx-pcs" data-p="4"><div>${R_FILES.map(([f, a, d, src], i) => `<p class="tx-frow" data-k="c-${i}"><code>${f}</code><span class="${src}">${src === "new" ? "new · review" : "playbook v1, unchanged"}</span></p>`).join("")}</div>
<div><p class="tj-dh" data-k="c-dh"><code>dry run</code><span>simulated against live state</span></p>${kv("c-k0", "reads", "4", "<em>policy, ACL, access block, distribution</em>")}${kv("c-k1", "writes", "0")}${kv("c-k2", "changes", "2 resources")}${kv("c-k3", "errors", "0")}</div></div>`;
const RLOG = [["10:42:03", "run E-1 approved by Sam Rivera"], ["10:42:03", "step 1  snapshot → s3://escher-artifacts/P-1/before.json"], ["10:42:04", "step 2  create-origin-access-control → oac-7f3a"], ["10:42:07", "step 3  put-bucket-policy, +1 statement"], ["10:42:08", "step 4  waiting for confirmation"], ["10:42:11", "step 4  confirmed by Sam Rivera · put-public-access-block"], ["10:42:14", "step 5  put-bucket-policy, −1 statement"]];
const pRun = `<div class="tj-dp tx-prun" data-p="5"><ol class="tx-log">${RLOG.map(([ts, l], i) => `<li data-k="g-${i}"><span>${ts}</span><code>${esc(l)}</code></li>`).join("")}</ol><p class="tj-dn" data-k="g-n">The model has no path to the write endpoint. Each step is its own request, sent after a person approves it.</p></div>`;
const pVer = `<div class="tj-dp tx-pver" data-p="6"><table class="tx-tbl"><thead><tr><th>Check</th><th>Before</th><th>After</th></tr></thead><tbody>${[["Access block flags on", "0 of 4", "4 of 4"], ["Anonymous GET", "200", "403"], ["exports-cdn GET", "200", "200"], ["Public buckets in prod", "1", "0"]].map(([c, a, z], i) => `<tr data-k="v-${i}"><td>${c}</td><td>${a}</td><td class="ok">${z}</td></tr>`).join("")}</tbody></table>
<div class="tx-vlog"><p class="tj-log" data-k="v-r">${ic("check")}<span>ufnd_xysj resolved, 4 reads attached</span><code>E-1</code></p><p class="tx-sl" data-k="v-s">${logo("slack")}<span>Posted to #seller-platform</span></p><p class="tj-dn" data-k="v-n">Verification runs its own reads. It doesn’t trust a step’s exit code.</p></div></div>`;
const RUN_T = [
  ["Ask", "Open a finding and ask about it.", "Context"],
  ["Options", "Escher lays out ways to fix it. You pick one.", "Blast radius"],
  ["Questions", "It asks only what the estate can’t answer.", "ask_user"],
  ["Plan", "Steps, parameters and blast radius, before any code.", "Plan"],
  ["Change set", "One file per step. Review it, then dry-run it.", "Change set"],
  ["Run", "You approve the run. Risky steps ask again.", "Execution log"],
  ["Verify", "Fresh reads prove the change landed.", "Verification"],
];
const runFig = `<figure class="tj tx" data-live="run" data-step="0"><div class="tj-stage"><div class="tj-win">${rscreen}
<div class="tj-dev"><div class="tj-dbar"><span class="tj-rec-dot"></span><span class="tj-dt">${RUN_T.map(([, , d], i) => `<b data-i="${i}">${i + 1} · ${d}</b>`).join("")}</span><span class="sx-sp"></span><span class="tj-ds" data-ds aria-live="off"></span><button type="button" class="tj-pp-btn" data-pause aria-label="Pause">${ic("pause")}${ic("play")}</button></div>
<div class="tj-dps">${pAsk}${pOpts}${pQs}${pPlan}${pCs}${pRun}${pVer}</div></div></div></div>
<ol class="steps tj-steps tx-steps">${RUN_T.map(([t, d], i) => `<li><button type="button" data-i="${i}"${i ? "" : ' aria-current="step"'}><span class="tj-pg"><i></i></span><span class="n">${i + 1}</span><b>${t}</b><span>${d}</span></button></li>`).join("")}</ol></figure>`;

const sprite = `<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute">${[...SPRITE.values()].join("")}</svg>`;
const ILL = { sprite, turn, "scr-home": home, "scr-ask": ask, "scr-exec": runFig, "scr-design": design, "scr-agents": agents, "gu-compare": compare, "gu-stream": stream, "gu-kinds": kinds, "gu-who": who, stack, arch, desktop, builds, "tokens-pipe": tokensPipe };

let html = readFileSync(PAGE, "utf8");
for (const [k, v] of Object.entries(ILL)) {
  const a = `<!--ill:${k}-->`, b = `<!--/ill:${k}-->`;
  const i = html.indexOf(a), j = html.indexOf(b);
  if (i < 0) { console.log("missing marker", k); continue; }
  html = j > i ? html.slice(0, i + a.length) + v + html.slice(j) : html.slice(0, i + a.length) + v + b + html.slice(i + a.length);
}
writeFileSync(PAGE, html);
console.log("screens ok", Object.keys(ILL).length, { wText, wUi, wBefore, symbols: SPRITE.size });
