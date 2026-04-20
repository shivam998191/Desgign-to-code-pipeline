import axios from "axios";
import { getConfig } from "../../config/index.js";
import { createLogger } from "../../logger/index.js";

const log = createLogger("figma");

export type FigmaDesignSummary = {
  fileKey: string;
  name: string;
  lastModified: string;
  pages: {
    name: string;
    frames: { name: string; type: string; charactersSample: string[] }[];
  }[];
};

export async function fetchFigmaFileStructured(fileKey: string): Promise<FigmaDesignSummary> {
  const cfg = getConfig();
  const url = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}`;
  log.debug({ fileKey }, "Fetching Figma file");
  const { data } = await axios.get(url, {
    headers: { "X-Figma-Token": cfg.FIGMA_API_TOKEN },
    timeout: 60_000,
  });

  const pages = (data.document?.children ?? []).map((page: { name?: string; children?: unknown[] }) => ({
    name: page.name ?? "Page",
    frames: summarizeNodes(page.children ?? []),
  }));

  return {
    fileKey,
    name: data.name ?? fileKey,
    lastModified: data.lastModified ?? "",
    pages,
  };
}

function summarizeNodes(nodes: unknown[], depth = 0): { name: string; type: string; charactersSample: string[] }[] {
  if (depth > 12 || !Array.isArray(nodes)) return [];
  const out: { name: string; type: string; charactersSample: string[] }[] = [];
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    const node = n as {
      type?: string;
      name?: string;
      characters?: string;
      children?: unknown[];
    };
    const type = node.type ?? "UNKNOWN";
    const name = node.name ?? "node";
    const chars: string[] = [];
    if (typeof node.characters === "string" && node.characters.trim()) {
      chars.push(node.characters.trim().slice(0, 200));
    }
    if (["FRAME", "COMPONENT", "INSTANCE", "GROUP", "SECTION"].includes(type)) {
      out.push({ name, type, charactersSample: chars });
    }
    if (node.children?.length) {
      out.push(...summarizeNodes(node.children, depth + 1));
    }
  }
  return out.slice(0, 200);
}
