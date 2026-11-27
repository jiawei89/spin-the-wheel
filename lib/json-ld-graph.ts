// One JSON-LD graph per page. The page's own schema (the copy's, completed by
// PageRenderer) and the site identity every home carries (Organization,
// WebSite), a breadcrumb trail and an FAQ used to ride separate script
// blocks, so a copy that already declared its Organization and WebSite
// published the site twice: mashup-maker.com's home held two Organization
// and two WebSite nodes in three blocks (2026-11-25). Here they become one
// graph: a node joins the node with its @id, or the one node of its type a
// page has (Organization, WebSite, BreadcrumbList, FAQPage), never two of
// the page's own nodes with their own @ids or an Organization of another
// name (a comparison page's competitor stays itself); the page's own
// fields win, the rest only fill what the page left out, and a reference to a
// merged-away @id is pointed at the node that stayed.
//
// Pure and self-contained (no imports), so the renderer and the tests run the
// same code.

type JsonLdNode = Record<string, unknown>;

/** Types a page describes once: a second one is the same entity said twice. */
const ONE_PER_PAGE = new Set(["Organization", "WebSite", "BreadcrumbList", "FAQPage"]);

function typesOf(node: JsonLdNode): string[] {
  const raw = node["@type"];
  return (Array.isArray(raw) ? raw : [raw]).filter((type): type is string => typeof type === "string");
}

function isNode(value: unknown): value is JsonLdNode {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** The top-level nodes of a JSON-LD value: an array, an @graph, or one node; @context goes (the graph carries one). */
export function jsonLdTopNodes(value: unknown): JsonLdNode[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdTopNodes);
  if (!isNode(value)) return [];
  const { "@context": _context, "@graph": graph, ...rest } = value;
  const own = Object.keys(rest).length ? [rest] : [];
  return [...own, ...(Array.isArray(graph) ? graph.flatMap(jsonLdTopNodes) : [])];
}

function replaceIds(value: unknown, aliases: ReadonlyMap<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => replaceIds(item, aliases));
  if (!isNode(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    key === "@id" && typeof child === "string" && aliases.has(child) ? aliases.get(child) : replaceIds(child, aliases),
  ]));
}

/**
 * The page's one graph. `own` is the page's schema (any shape); `site` are the
 * renderer's nodes, in the order they fill gaps. Null when there is nothing.
 */
export function mergeJsonLdGraph(own: unknown, site: readonly unknown[] = []): JsonLdNode | null {
  const nodes: JsonLdNode[] = [];
  const aliases = new Map<string, string>();
  const idOf = (node: JsonLdNode) => (typeof node["@id"] === "string" ? node["@id"] : null);
  const nameOf = (node: JsonLdNode) => (typeof node.name === "string" ? node.name.trim().toLowerCase() : null);
  /**
   * Whether `node` is the same entity as `candidate` by type alone. Two of the
   * page's own nodes with their own @ids are two entities (a comparison
   * page's competitor beside the brand); one without an @id is the page's
   * one node of that type said again, and the renderer's node joins a page
   * node of its type. An Organization named otherwise is another
   * organization whatever its @id.
   */
  const sameByType = (node: JsonLdNode, candidate: JsonLdNode, fromSite: boolean, types: readonly string[]) => {
    if (!typesOf(candidate).some((type) => types.includes(type))) return false;
    const [nodeName, candidateName] = [nameOf(node), nameOf(candidate)];
    if (types.includes("Organization") && nodeName && candidateName && nodeName !== candidateName) return false;
    if (!idOf(node) || !idOf(candidate)) return true;
    return fromSite;
  };
  const add = (node: JsonLdNode, fromSite: boolean) => {
    const id = idOf(node);
    let target = id ? nodes.find((candidate) => candidate["@id"] === id) : undefined;
    if (!target) {
      const single = typesOf(node).filter((type) => ONE_PER_PAGE.has(type));
      if (single.length) target = nodes.find((candidate) => sameByType(node, candidate, fromSite, single));
    }
    if (!target) {
      nodes.push({ ...node });
      return;
    }
    // The node already there came first: the page's own fields win.
    for (const [key, value] of Object.entries(node)) {
      if (target[key] === undefined) target[key] = value;
    }
    const kept = target["@id"];
    if (id && typeof kept === "string" && kept !== id) aliases.set(id, kept);
  };
  for (const node of jsonLdTopNodes(own)) add(node, false);
  for (const node of site.flatMap(jsonLdTopNodes)) add(node, true);
  if (!nodes.length) return null;
  const graph = aliases.size ? nodes.map((node) => replaceIds(node, aliases) as JsonLdNode) : nodes;
  return { "@context": "https://schema.org", "@graph": graph };
}
