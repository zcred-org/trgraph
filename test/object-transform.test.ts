import { suite } from "uvu";
import { TrGraph } from "../src/graph.js";
import * as a from "uvu/assert";
import { GraphLink, TrSchema } from "../src/index.js";

const test = suite("Object transform tests");

test("transform object", () => {
  const trGraph = new TrGraph();
  const result = trGraph.objectTransform({
    name: "Test"
  }, {
    name: ["utf8-bytes", "bytes-uint256"]
  });
  a.equal(result, {
    transformed: { name: 1415934836n },
    linear: [1415934836n]
  });
});

test("spread liner form", () => {
  const trGraph = new TrGraph();
  const result = trGraph.objectTransform({
    name: "Test"
  }, {
    name: ["utf8-bytes"]
  }).linear;
  a.equal(result, [84, 101, 115, 116]);
});

test("Complex object", () => {
  const trGraph = new TrGraph();
  const result = trGraph.objectTransform({
    name: "TrGraph",
    components: {
      links: {
        name: "transformation links",
        number: 200,
        required: true
      },
      nodes: {
        name: "transformation nodes",
        number: 40,
        required: false
      }
    },
  }, {
    name: ["utf8-bytes", "bytes-uint256"],
    components: {
      links: {
        name: ["utf8-bytes"],
        number: ["uint32"],
        required: ["boolean-uint"]
      },
      nodes: {
        name: ["utf8-bytes", "bytes-uint"],
        number: ["uint32"],
        required: ["boolean-uint"]
      }
    }
  });
  a.equal(result, {
    transformed: {
      name: 23769549230927976n,
      components: {
        links: {
          name: new Uint8Array([116, 114, 97, 110, 115, 102, 111, 114, 109, 97, 116, 105, 111, 110, 32, 108, 105, 110, 107, 115]),
          number: 200n,
          required: 1n
        },
        nodes: {
          name: 664793701844386712104499556575184449006360356211n,
          number: 40n,
          required: 0n
        }
      }
    },
    linear: [
      23769549230927976n,
      116,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      97,
      116,
      105,
      111,
      110,
      32,
      108,
      105,
      110,
      107,
      115,
      200n,
      1n,
      664793701844386712104499556575184449006360356211n,
      40n,
      0n
    ]
  });
});

test("Invalid object", () => {
  const trGraph = new TrGraph();
  const trSchema: TrSchema<GraphLink> = {
    name: ["bytes-uint"]
  };
  a.throws(() => {
    trGraph.objectTransform({}, trSchema);
  });
});

test.run();