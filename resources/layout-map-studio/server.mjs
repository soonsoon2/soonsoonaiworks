import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";

const rootDir = resolve(new URL(".", import.meta.url).pathname);
const defaultPort = 4175;
const portArgIndex = process.argv.indexOf("--port");
const port = Number(process.env.PORT || (portArgIndex >= 0 ? process.argv[portArgIndex + 1] : defaultPort));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

loadEnvFile(join(rootDir, ".env"));
loadEnvFile(join(homedir(), ".config", "sam", ".env"));

const SAM_BASE_URL = process.env.SAM_BASE_URL || "https://sam.soonsoon.ai";
const SAM_AGENT_MODEL = process.env.SAM_AGENT_MODEL || "gpt-5.4-mini";
const MODEL_FALLBACKS = ["gpt-5.4-mini", "claude-haiku", "gpt-5.4-nano"];
const layoutExportRoot = resolve(process.env.LAYOUT_MAP_EXPORT_DIR || join(rootDir, "exports"));
const layoutProjectSlug = process.env.LAYOUT_MAP_PROJECT_SLUG || "";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    const equalIndex = clean.indexOf("=");
    if (equalIndex < 1) return;
    const key = clean.slice(0, equalIndex).trim();
    const value = clean.slice(equalIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        rejectBody(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function truncateText(value, limit = 14_000) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n...truncated`;
}

function safeSlug(value, fallback = "layout-map") {
  const clean = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || fallback;
}

function decodeDataUrl(dataUrl) {
  const text = String(dataUrl || "");
  const match = text.match(/^data:image\/png;base64,(.+)$/);
  if (!match) throw new Error("previewPngDataUrl must be a PNG data URL");
  return Buffer.from(match[1], "base64");
}

async function saveProjectBundle(payload) {
  const projectSlug = safeSlug(layoutProjectSlug || payload.slug, "layout-map");
  const directory = resolve(layoutExportRoot, projectSlug);
  if (!directory.startsWith(layoutExportRoot)) throw new Error("Invalid export path");

  const mapJson = String(payload.mapJson || "");
  const briefMarkdown = String(payload.briefMarkdown || "");
  if (!mapJson.trim()) throw new Error("mapJson is required");
  if (!briefMarkdown.trim()) throw new Error("briefMarkdown is required");

  const previewPng = decodeDataUrl(payload.previewPngDataUrl);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${projectSlug}-layout-map.json`), mapJson);
  await writeFile(join(directory, `${projectSlug}-layout-brief.md`), briefMarkdown);
  await writeFile(join(directory, `${projectSlug}-layout-preview.png`), previewPng);

  return {
    directory,
    files: [
      `${projectSlug}-layout-map.json`,
      `${projectSlug}-layout-brief.md`,
      `${projectSlug}-layout-preview.png`,
    ],
    relativePath: relative(process.cwd(), directory),
  };
}

async function loadProjectBundle() {
  const projectSlug = safeSlug(layoutProjectSlug, "layout-map");
  const directory = resolve(layoutExportRoot, projectSlug);
  if (!directory.startsWith(layoutExportRoot)) throw new Error("Invalid export path");

  const mapPath = join(directory, `${projectSlug}-layout-map.json`);
  const briefPath = join(directory, `${projectSlug}-layout-brief.md`);
  const mapJson = await readFile(mapPath, "utf8");
  let briefMarkdown = "";
  try {
    briefMarkdown = await readFile(briefPath, "utf8");
  } catch {
    briefMarkdown = "";
  }

  return {
    briefMarkdown,
    directory,
    files: [
      `${projectSlug}-layout-map.json`,
      `${projectSlug}-layout-brief.md`,
      `${projectSlug}-layout-preview.png`,
    ],
    map: JSON.parse(mapJson),
    relativePath: relative(process.cwd(), directory),
  };
}

function extractOutputContent(result) {
  return (
    result?.output?.content ||
    result?.content ||
    result?.text ||
    result?.choices?.[0]?.message?.content ||
    result?.choices?.[0]?.text ||
    ""
  );
}

function parseJsonish(text) {
  const clean = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("Agent returned non-JSON content");
  }
}

function getSystemPrompt() {
  return [
    "You are SAM Layout Agent inside a UI prototyping tool.",
    "Read the current canvas map, AI View, Hierarchy, and Inspector fields.",
    "Answer in Korean. Return JSON only, with no markdown fences.",
    "Allowed patch scope: existing node fields memo, finalRole, flex, gap; patch.selectedId; patch.canvas.ratio.",
    "Do not change ids, children, classes, class contracts, split direction, or node type.",
    "For assign-roles and refine, include a concrete patch whenever useful. For chat, include a patch when the user asks to fix, change, apply, set, or update values.",
    "finalRole must be a concise human-editable label. memo must explain what the region is for and how it should be designed.",
    "flex must be a positive number. gap is only for split nodes and must be 0 to 48. ratio must be one of 16:9, 4:3, 1:1, 9:16.",
    "Respect class prefixes l-, c-, is-, u-. Mention class concerns in recommendations instead of rewriting classes.",
    "Schema: {\"reply\":\"string\",\"summary\":[\"string\"],\"recommendations\":[\"string\"],\"patch\":{\"canvas\":{\"ratio\":\"16:9\"},\"selectedId\":\"node-id\",\"nodes\":{\"node-id\":{\"memo\":\"string\",\"finalRole\":\"string\",\"flex\":1,\"gap\":0}}}}",
  ].join("\n");
}

function getUserPrompt(payload) {
  const actionLabel =
    {
      "assign-roles": "Assign concise final roles and fill missing memos. Return a patch for every region that should be updated.",
      chat: "Answer the user's chat request using the layout context.",
      refine: "Review the layout semantics and return safe concrete patches for memo, finalRole, flex, gap, selectedId, or canvas ratio when useful.",
      review: "Review the current layout and summarize risks.",
    }[payload.action] || "Review the current layout.";

  return JSON.stringify(
    {
      action: payload.action,
      actionGoal: actionLabel,
      message: payload.message || "",
      context: {
        aiView: {
          map: truncateText(payload.context?.aiView?.map),
          prompt: truncateText(payload.context?.aiView?.prompt, 4000),
          rules: truncateText(payload.context?.aiView?.rules, 4000),
        },
        canvas: payload.context?.canvas,
        outline: payload.context?.outline,
        selected: payload.context?.selected,
      },
    },
    null,
    2,
  );
}

function getLocalPatch(payload) {
  const patch = { nodes: {} };
  const outline = Array.isArray(payload.context?.outline) ? payload.context.outline : [];
  const memoByArea = {
    body: "주요 콘텐츠와 작업 결과가 표시되는 중심 영역입니다.",
    foot: "하단 상태, 보조 정보, 후속 작업을 정리하는 영역입니다.",
    "sidebar-left": "구조 탐색과 선택 요소 편집을 담당하는 좌측 작업 영역입니다.",
    "sidebar-right": "AI 에이전트와 대화하며 화면 구조를 정리하는 보조 영역입니다.",
    top: "현재 도구, 화면 상태, 프리뷰 옵션을 빠르게 조작하는 상단 도구 영역입니다.",
  };
  const roleByArea = {
    body: "Main content",
    foot: "Footer summary",
    "sidebar-left": "Primary navigation",
    "sidebar-right": "Agent workspace",
    top: "Top toolbar",
  };

  outline.forEach((item) => {
    if (item.type !== "region") return;
    patch.nodes[item.id] = {
      finalRole: item.finalRole || roleByArea[item.area] || "Content section",
      flex: item.flex || 1,
      memo: item.memo || memoByArea[item.area] || "화면의 독립적인 콘텐츠 섹션입니다.",
    };
  });
  return patch;
}

function localFallback(payload, reason) {
  const selected = payload.context?.selected;
  const patch = payload.action === "assign-roles" || payload.action === "refine" ? getLocalPatch(payload) : { nodes: {} };
  return {
    meta: {
      model: "local-fallback",
      source: reason,
    },
    patch,
    recommendations: ["SAM 호출이 가능해지면 같은 액션을 다시 실행해 모델 판단으로 비교하세요."],
    reply: [
      "로컬 규칙으로 현재 맵을 정리했습니다.",
      selected?.id ? `선택 영역은 ${selected.id}이고 현재 역할은 ${selected.finalRoleResolved || selected.role || "content"}입니다.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    summary: Object.keys(patch.nodes).length ? [`${Object.keys(patch.nodes).length}개 영역의 설명/최종 역할 후보를 준비했습니다.`] : [],
  };
}

async function callSam(payload) {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) return localFallback(payload, "missing SAM_API_KEY");

  const models = [SAM_AGENT_MODEL, ...MODEL_FALLBACKS].filter((model, index, list) => model && list.indexOf(model) === index);
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(`${SAM_BASE_URL}/v1/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: getSystemPrompt() },
            ...((Array.isArray(payload.history) ? payload.history : []).slice(-6)),
            { role: "user", content: getUserPrompt(payload) },
          ],
          options: {
            max_tokens: 1600,
            stream: false,
            temperature: 0.15,
          },
        }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`SAM ${response.status}: ${text.slice(0, 300)}`);
      const raw = JSON.parse(text);
      const parsed = parseJsonish(extractOutputContent(raw));
      return {
        meta: {
          durationMs: raw?.meta?.duration_ms,
          model: raw?.model || model,
          provider: raw?.meta?.provider,
          source: "sam",
        },
        patch: parsed.patch || { nodes: {} },
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        reply: parsed.reply || "",
        summary: Array.isArray(parsed.summary) ? parsed.summary : [],
      };
    } catch (error) {
      lastError = error;
    }
  }

  return localFallback(payload, lastError?.message || "SAM unavailable");
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(rootDir, requested));
  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

createServer(async (request, response) => {
  if (request.method === "POST" && request.url?.startsWith("/api/sam/agent")) {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      sendJson(response, 200, await callSam(payload));
    } catch (error) {
      sendJson(response, 500, {
        error: "agent_request_failed",
        message: error.message,
      });
    }
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/api/layout/load-project")) {
    try {
      sendJson(response, 200, await loadProjectBundle());
    } catch (error) {
      sendJson(response, 404, {
        error: "project_load_failed",
        message: error.message,
      });
    }
    return;
  }

  if (request.method === "POST" && request.url?.startsWith("/api/layout/save-project")) {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      sendJson(response, 200, await saveProjectBundle(payload));
    } catch (error) {
      sendJson(response, 500, {
        error: "project_save_failed",
        message: error.message,
      });
    }
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    await serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
}).listen(port, () => {
  console.log(`Layout Map Studio server running at http://localhost:${port}/`);
  console.log(`SAM agent model: ${SAM_AGENT_MODEL}`);
  console.log(`Layout export root: ${layoutExportRoot}`);
});
