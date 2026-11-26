#!/usr/bin/env node
/**
 * scholarly-evidence-contract.mjs — fail-closed contract for scholarly research.
 *
 * The human-readable handback carries a fenced `scholarly-evidence.v1` JSON
 * packet. The packet records the queries, sources, read depth, claim-to-source
 * mappings, synthesis, coverage, and handback. A Markdown file is checked for
 * both the packet and the required synthesis shape; a .json file is checked as
 * the packet alone.
 *
 * Usage:
 *   node scripts/scholarly-evidence-contract.mjs <handback.md>
 *   node scripts/scholarly-evidence-contract.mjs <evidence.json>
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SCHEMA = "scholarly-evidence.v1";
const SCOPES = new Set(["single-paper", "small-set", "field", "systematic"]);
const INDEXES = new Set(["openalex", "semantic-scholar", "arxiv", "alphaxiv", "crossref", "opencitations", "web"]);
const SEARCH_STATUSES = new Set(["completed", "partial", "blocked"]);
const PUBLICATION_STATUSES = new Set(["published", "preprint", "retracted", "expression_of_concern", "unknown"]);
const READ_DEPTHS = new Set(["metadata", "snippet", "abstract", "section", "full", "pdf-page", "table"]);
const VERIFIED_DEPTHS = new Set(["section", "full", "pdf-page", "table"]);
const ACCESS = new Set(["read", "blocked", "paywalled", "unreachable"]);
const RELATIONS = new Set(["supports", "challenges", "contextual"]);
const CLAIM_KINDS = new Set(["presence", "absence", "method", "result", "background"]);
const CLAIM_STATUSES = new Set(["verified", "partial", "blocked", "unverified", "inferred"]);
const DOI = /^10\.\d{4,9}\/\S+$/i;
const ARXIV = /^(?:\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[a-z]{2})?\/\d{7}(?:v\d+)?)$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const ROOT_KEYS = ["schema", "question", "scope", "searches", "sources", "claims", "synthesis", "coverage", "handback"];
const SEARCH_KEYS = ["id", "question", "index", "endpoint", "query", "searched_on", "status", "returned", "screened", "included_source_ids", "notes"];
const SOURCE_KEYS = ["id", "title", "year", "venue", "doi", "arxiv", "url", "publication_status", "read_depth", "locator", "access", "relation", "questions"];
const CLAIM_KEYS = ["id", "kind", "text", "status", "support", "search_ids", "boundary"];
const SUPPORT_KEYS = ["source_id", "locator", "relation", "status"];
const SYNTHESIS_KEYS = ["consensus", "disagreements", "trajectories", "open_questions", "source_status"];
const COVERAGE_KEYS = ["records_identified", "reports_sought", "reports_retrieved", "studies_included", "single_reviewer", "notes"];
const HANDBACK_KEYS = ["decision", "can_support", "cannot_support"];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isText(value) {
  return typeof value === "string" && value.trim() !== "";
}
function isId(value) {
  return typeof value === "string" && ID.test(value);
}
function isDate(value) {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function isCount(value) {
  return Number.isInteger(value) && value >= 0;
}
function isHttpUrl(value) {
  if (!isText(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
function endpointMatches(index, endpoint) {
  if (!isHttpUrl(endpoint)) return false;
  if (index === "web") return true;
  const hosts = {
    openalex: "api.openalex.org",
    "semantic-scholar": "api.semanticscholar.org",
    arxiv: "export.arxiv.org",
    alphaxiv: "api.alphaxiv.org",
    crossref: "api.crossref.org",
    opencitations: "api.opencitations.net",
  };
  try {
    return new URL(endpoint).hostname === hosts[index];
  } catch {
    return false;
  }
}
function checkKeys(value, required, optional, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label} has unknown field: ${key}`);
  }
  for (const key of required) {
    if (!optional.includes(key) && !(key in value)) errors.push(`${label} is missing field: ${key}`);
  }
  return true;
}
function checkIdArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }
  for (const [index, id] of value.entries()) {
    if (!isId(id)) errors.push(`${label}[${index}] must be a short identifier`);
  }
}
function checkTextArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }
  for (const [index, text] of value.entries()) {
    if (!isText(text)) errors.push(`${label}[${index}] must be non-empty text`);
  }
}

export function validateScholarlyEvidence(record) {
  const errors = [];
  if (!checkKeys(record, ROOT_KEYS, ["coverage"], "scholarly-evidence", errors)) {
    return { valid: false, errors, counts: null };
  }
  if (record.schema !== SCHEMA) errors.push(`schema must be ${SCHEMA}`);
  if (!isText(record.question)) errors.push("question must be non-empty");
  if (!SCOPES.has(record.scope)) errors.push(`scope must be one of ${[...SCOPES].join(", ")}`);

  const searches = new Map();
  if (!Array.isArray(record.searches) || record.searches.length === 0) {
    errors.push("searches must be a non-empty array");
  } else {
    record.searches.forEach((search, index) => {
      const label = `searches[${index}]`;
      if (!checkKeys(search, SEARCH_KEYS, ["notes"], label, errors)) return;
      if (!isId(search.id)) errors.push(`${label}.id must be a short identifier`);
      else if (searches.has(search.id)) errors.push(`${label}.id is duplicated`);
      else searches.set(search.id, search);
      if (!isText(search.question)) errors.push(`${label}.question must be non-empty`);
      if (!INDEXES.has(search.index)) errors.push(`${label}.index must be one of ${[...INDEXES].join(", ")}`);
      if (!endpointMatches(search.index, search.endpoint)) errors.push(`${label}.endpoint must be an HTTP(S) URL for ${search.index}`);
      if (!isText(search.query)) errors.push(`${label}.query must be non-empty`);
      if (!isDate(search.searched_on)) errors.push(`${label}.searched_on must be a real ISO date`);
      if (!SEARCH_STATUSES.has(search.status)) errors.push(`${label}.status must be completed, partial, or blocked`);
      if (!isCount(search.returned)) errors.push(`${label}.returned must be a non-negative integer`);
      if (!isCount(search.screened)) errors.push(`${label}.screened must be a non-negative integer`);
      if (isCount(search.returned) && isCount(search.screened) && search.screened > search.returned) {
        errors.push(`${label}.screened cannot exceed returned`);
      }
      if (search.status !== "completed" && !isText(search.notes)) {
        errors.push(`${label}.notes must explain a partial or blocked search`);
      }
      checkIdArray(search.included_source_ids, `${label}.included_source_ids`, errors);
    });
  }

  const sources = new Map();
  if (!Array.isArray(record.sources) || record.sources.length === 0) {
    errors.push("sources must be a non-empty array");
  } else {
    record.sources.forEach((source, index) => {
      const label = `sources[${index}]`;
      if (!checkKeys(source, SOURCE_KEYS, ["doi", "arxiv", "url"], label, errors)) return;
      if (!isId(source.id)) errors.push(`${label}.id must be a short identifier`);
      else if (sources.has(source.id)) errors.push(`${label}.id is duplicated`);
      else sources.set(source.id, source);
      if (!isText(source.title)) errors.push(`${label}.title must be non-empty`);
      if (!Number.isInteger(source.year) || source.year < 1000 || source.year > 9999) errors.push(`${label}.year must be a four-digit integer`);
      if (!isText(source.venue)) errors.push(`${label}.venue must be non-empty`);
      if (!source.doi && !source.arxiv && !source.url) errors.push(`${label} must carry a DOI, arXiv id, or URL`);
      if (source.doi !== undefined && !DOI.test(source.doi)) errors.push(`${label}.doi is not a DOI`);
      if (source.arxiv !== undefined && !ARXIV.test(source.arxiv)) errors.push(`${label}.arxiv is not an arXiv id`);
      if (source.url !== undefined && !isHttpUrl(source.url)) errors.push(`${label}.url must be an HTTP(S) URL`);
      if (!PUBLICATION_STATUSES.has(source.publication_status)) errors.push(`${label}.publication_status is invalid`);
      if (!READ_DEPTHS.has(source.read_depth)) errors.push(`${label}.read_depth is invalid`);
      if (!isText(source.locator)) errors.push(`${label}.locator must name the section, page, table, or record actually read`);
      if (!ACCESS.has(source.access)) errors.push(`${label}.access is invalid`);
      if (!RELATIONS.has(source.relation)) errors.push(`${label}.relation is invalid`);
      checkTextArray(source.questions, `${label}.questions`, errors);
      if (source.access !== "read" && !["metadata", "snippet"].includes(source.read_depth)) {
        errors.push(`${label} claims ${source.read_depth} depth but access is ${source.access}`);
      }
      if (VERIFIED_DEPTHS.has(source.read_depth) && source.access !== "read") {
        errors.push(`${label} cannot claim ${source.read_depth} depth without access=read`);
      }
    });
  }

  for (const search of searches.values()) {
    for (const sourceId of search.included_source_ids ?? []) {
      if (!sources.has(sourceId)) errors.push(`search ${search.id} includes unknown source ${sourceId}`);
    }
  }

  const claims = new Map();
  if (!Array.isArray(record.claims) || record.claims.length === 0) {
    errors.push("claims must be a non-empty array");
  } else {
    record.claims.forEach((claim, index) => {
      const label = `claims[${index}]`;
      if (!checkKeys(claim, CLAIM_KEYS, ["search_ids", "boundary"], label, errors)) return;
      if (!isId(claim.id)) errors.push(`${label}.id must be a short identifier`);
      else if (claims.has(claim.id)) errors.push(`${label}.id is duplicated`);
      else claims.set(claim.id, claim);
      if (!CLAIM_KINDS.has(claim.kind)) errors.push(`${label}.kind is invalid`);
      if (!isText(claim.text)) errors.push(`${label}.text must be non-empty`);
      if (!CLAIM_STATUSES.has(claim.status)) errors.push(`${label}.status is invalid`);
      if (claim.boundary !== undefined && !isText(claim.boundary)) errors.push(`${label}.boundary must be non-empty when provided`);
      checkIdArray(claim.search_ids ?? [], `${label}.search_ids`, errors);
      for (const searchId of claim.search_ids ?? []) {
        if (!searches.has(searchId)) errors.push(`${label} references unknown search ${searchId}`);
      }

      if (!Array.isArray(claim.support)) {
        errors.push(`${label}.support must be an array`);
      } else {
        if (["verified", "inferred"].includes(claim.status) && claim.support.length === 0) {
          errors.push(`${label} is ${claim.status} but carries no source support`);
        }
        if (claim.status === "partial" && claim.kind !== "absence" && claim.support.length === 0) {
          errors.push(`${label} is partial but carries no source support`);
        }
        for (const [supportIndex, support] of claim.support.entries()) {
          const supportLabel = `${label}.support[${supportIndex}]`;
          if (!checkKeys(support, SUPPORT_KEYS, [], supportLabel, errors)) continue;
          const source = sources.get(support.source_id);
          if (!source) errors.push(`${supportLabel} references unknown source ${support.source_id}`);
          if (!isText(support.locator)) errors.push(`${supportLabel}.locator must be non-empty`);
          if (!RELATIONS.has(support.relation)) errors.push(`${supportLabel}.relation is invalid`);
          if (!CLAIM_STATUSES.has(support.status)) errors.push(`${supportLabel}.status is invalid`);
          if (support.status === "verified" && source) {
            if (!VERIFIED_DEPTHS.has(source.read_depth) || source.access !== "read") {
              errors.push(`${supportLabel} is verified but ${source.id} was read only at ${source.read_depth} depth`);
            }
            if (["retracted", "expression_of_concern"].includes(source.publication_status)) {
              errors.push(`${supportLabel} cannot be verified support from a ${source.publication_status} source`);
            }
          }
        }
      }

      if (claim.kind === "absence") {
        if (claim.status === "verified") {
          errors.push(`${label} is an absence claim; keyword or index coverage cannot make it verified`);
        }
        if (["partial", "unverified"].includes(claim.status)) {
          if (!Array.isArray(claim.search_ids) || claim.search_ids.length === 0) {
            errors.push(`${label} absence claim must name the searches it rests on`);
          }
          if (!isText(claim.boundary)) errors.push(`${label} absence claim must state its search boundary`);
        }
      }
    });
  }

  if (!isObject(record.synthesis)) {
    errors.push("synthesis must be an object");
  } else if (checkKeys(record.synthesis, SYNTHESIS_KEYS, [], "synthesis", errors)) {
    const synthesis = record.synthesis;
    for (const key of ["consensus", "disagreements", "trajectories", "open_questions", "source_status"]) {
      if (!Array.isArray(synthesis[key])) errors.push(`synthesis.${key} must be an array`);
    }
    if (["field", "systematic"].includes(record.scope)) {
      for (const key of ["consensus", "disagreements", "trajectories", "open_questions", "source_status"]) {
        if (Array.isArray(synthesis[key]) && synthesis[key].length === 0) errors.push(`synthesis.${key} cannot be empty for a ${record.scope} review`);
      }
    }
    if (record.scope === "small-set") {
      for (const key of ["consensus", "disagreements", "open_questions"]) {
        if (Array.isArray(synthesis[key]) && synthesis[key].length === 0) errors.push(`synthesis.${key} cannot be empty for a small-set review`);
      }
    }
    if (Array.isArray(synthesis.open_questions) && synthesis.open_questions.length === 0) {
      errors.push("synthesis.open_questions cannot be empty; say what the evidence does not settle");
    }

    for (const [index, item] of (synthesis.consensus ?? []).entries()) {
      const label = `synthesis.consensus[${index}]`;
      if (!checkKeys(item, ["claim", "source_ids", "conditions"], [], label, errors)) continue;
      if (!isText(item.claim)) errors.push(`${label}.claim must be non-empty`);
      if (!isText(item.conditions)) errors.push(`${label}.conditions must name where the agreement holds`);
      checkIdArray(item.source_ids, `${label}.source_ids`, errors);
      if (Array.isArray(item.source_ids) && new Set(item.source_ids).size < 2) errors.push(`${label} needs two independent sources`);
      for (const sourceId of item.source_ids ?? []) if (!sources.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}`);
    }
    for (const [index, item] of (synthesis.disagreements ?? []).entries()) {
      const label = `synthesis.disagreements[${index}]`;
      if (!checkKeys(item, ["claim", "sides", "resolution"], [], label, errors)) continue;
      if (!isText(item.claim)) errors.push(`${label}.claim must be non-empty`);
      if (!isText(item.resolution)) errors.push(`${label}.resolution must say what would resolve the disagreement`);
      if (!Array.isArray(item.sides) || item.sides.length < 2) {
        errors.push(`${label}.sides must contain at least two positions`);
      } else {
        item.sides.forEach((side, sideIndex) => {
          const sideLabel = `${label}.sides[${sideIndex}]`;
          if (!checkKeys(side, ["position", "source_ids"], [], sideLabel, errors)) return;
          if (!isText(side.position)) errors.push(`${sideLabel}.position must be non-empty`);
          checkIdArray(side.source_ids, `${sideLabel}.source_ids`, errors);
          for (const sourceId of side.source_ids ?? []) if (!sources.has(sourceId)) errors.push(`${sideLabel} references unknown source ${sourceId}`);
        });
      }
    }
    for (const [index, item] of (synthesis.trajectories ?? []).entries()) {
      const label = `synthesis.trajectories[${index}]`;
      if (!checkKeys(item, ["name", "source_ids", "change"], [], label, errors)) continue;
      if (!isText(item.name)) errors.push(`${label}.name must be non-empty`);
      if (!isText(item.change)) errors.push(`${label}.change must say what changed direction`);
      checkIdArray(item.source_ids, `${label}.source_ids`, errors);
      for (const sourceId of item.source_ids ?? []) if (!sources.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}`);
    }
    checkTextArray(synthesis.open_questions, "synthesis.open_questions", errors);
    for (const [index, item] of (synthesis.source_status ?? []).entries()) {
      const label = `synthesis.source_status[${index}]`;
      if (!checkKeys(item, ["source_id", "status", "checked_on", "note"], ["note"], label, errors)) continue;
      const source = sources.get(item.source_id);
      if (!source) errors.push(`${label} references unknown source ${item.source_id}`);
      if (!PUBLICATION_STATUSES.has(item.status)) errors.push(`${label}.status is invalid`);
      if (source && item.status !== source.publication_status) errors.push(`${label}.status disagrees with sources.${item.source_id}.publication_status`);
      if (!isDate(item.checked_on)) errors.push(`${label}.checked_on must be a real ISO date`);
      if (item.note !== undefined && !isText(item.note)) errors.push(`${label}.note must be non-empty when provided`);
    }
  }

  if (record.scope === "systematic" && record.coverage === undefined) errors.push("coverage is required for a systematic review");
  if (record.coverage !== undefined) {
    if (!checkKeys(record.coverage, COVERAGE_KEYS, [], "coverage", errors)) {
      // skip numeric checks
    } else {
      const coverage = record.coverage;
      for (const key of ["records_identified", "reports_sought", "reports_retrieved", "studies_included"]) {
        if (!isCount(coverage[key])) errors.push(`coverage.${key} must be a non-negative integer`);
      }
      if (typeof coverage.single_reviewer !== "boolean") errors.push("coverage.single_reviewer must be boolean");
      if (!isText(coverage.notes)) errors.push("coverage.notes must state the accounting basis and reviewer limitation");
      if (isCount(coverage.records_identified) && isCount(coverage.reports_sought) && coverage.reports_sought > coverage.records_identified) {
        errors.push("coverage.reports_sought cannot exceed records_identified");
      }
      if (isCount(coverage.reports_sought) && isCount(coverage.reports_retrieved) && coverage.reports_retrieved > coverage.reports_sought) {
        errors.push("coverage.reports_retrieved cannot exceed reports_sought");
      }
      if (isCount(coverage.reports_retrieved) && isCount(coverage.studies_included) && coverage.studies_included > coverage.reports_retrieved) {
        errors.push("coverage.studies_included cannot exceed reports_retrieved");
      }
    }
  }

  if (!isObject(record.handback)) {
    errors.push("handback must be an object");
  } else if (checkKeys(record.handback, HANDBACK_KEYS, [], "handback", errors)) {
    for (const key of HANDBACK_KEYS) if (!isText(record.handback[key])) errors.push(`handback.${key} must be non-empty`);
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      searches: searches.size,
      sources: sources.size,
      claims: claims.size,
    },
  };
}

function extractPacket(markdown, errors) {
  const fences = [...markdown.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (fences.length !== 1) {
    errors.push(`expected exactly one fenced json evidence packet, found ${fences.length}`);
    return null;
  }
  try {
    return JSON.parse(fences[0][1]);
  } catch (error) {
    errors.push(`evidence packet is not valid JSON: ${error.message}`);
    return null;
  }
}

export function validateScholarlyMarkdown(markdown) {
  const errors = [];
  if (typeof markdown !== "string" || markdown.trim() === "") return { valid: false, errors: ["markdown is empty"], counts: null };
  const packet = extractPacket(markdown, errors);
  let packetResult = null;
  if (packet) {
    packetResult = validateScholarlyEvidence(packet);
    errors.push(...packetResult.errors.map((error) => `evidence packet: ${error}`));
  }
  const scope = packet?.scope;
  const headings = ["Consensus", "Disagreements", "What the literature does not settle", "Handback"];
  if (["field", "systematic", undefined].includes(scope)) headings.push("Trajectories", "Source status");
  if (scope === "systematic") headings.push("Search coverage");
  for (const heading of headings) {
    if (!new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im").test(markdown)) {
      errors.push(`missing required heading: ## ${heading}`);
    }
  }
  const tableLines = markdown.split("\n").filter((line) => /^\s*\|/.test(line));
  if (!tableLines.some((line) => /\bQuestion\b/i.test(line) && /\bDepth\b/i.test(line))) {
    errors.push("evidence table must include Question and Depth columns");
  }
  if (!/(?:§\s*\d|(?<![\w/.-])p\.\s*\d+|\[\[page\s+\d+\]\]|Table\s+\d+|section\s+\d+|path:\d+)/i.test(markdown)) {
    errors.push("no section, page, table, or path:line locator found; metadata-only claims cannot be verified");
  }
  return { valid: errors.length === 0, errors, counts: packetResult?.counts ?? null };
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/scholarly-evidence-contract.mjs <handback.md|evidence.json>");
    process.exit(2);
  }
  let text;
  try {
    text = readFileSync(resolve(file), "utf8");
  } catch (error) {
    console.error(`cannot read ${file}: ${error.message}`);
    process.exit(2);
  }
  const result = file.toLowerCase().endsWith(".md")
    ? validateScholarlyMarkdown(text)
    : validateScholarlyEvidence(JSON.parse(text));
  if (!result.valid) {
    console.error(result.errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }
  console.log(`PASS: scholarly evidence valid — ${result.counts.searches} searches, ${result.counts.sources} sources, ${result.counts.claims} claims`);
}
