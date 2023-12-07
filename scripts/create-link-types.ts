import { TrGraph } from "../src/graph.js";
import { writeFileSync } from "fs";

const ROOT_DIR = new URL("../", import.meta.url);

export function createGraphLinkTypes() {
  console.log("Create GraphLink types: start");
  const trGraph = new TrGraph();
  const links = trGraph["links"];
  const types =
    `export const GRAPH_LINKS = ${JSON.stringify(Object.keys(links), null, 2)} as const\n\n` +
    `export type GraphLink = typeof GRAPH_LINKS[number]`;
  writeFileSync(new URL("./src/types/graphlink.ts", ROOT_DIR), types);
  console.log("Create GraphLink types: end");
}

createGraphLinkTypes();
