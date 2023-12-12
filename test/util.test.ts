import { suite } from "uvu";
import { objUtil } from "../src/util.js";
import * as a from "uvu/assert";

const test = suite("Utility tests");

test("objUtil getPaths", () => {
  const paths = objUtil.getValuePaths({
    name: "TrGraph",
    age: 23,
    mustBeUndefined: undefined,
    mustBeNull: null,
    family: {
      mam: {
        name: "TrGraphMam",
        age: 46
      },
      dad: {
        name: "TrGraphDad",
        age: 69n
      }
    }
  });
  a.equal(paths, [
    ["name"],
    ["age"],
    ["family", "mam", "name"],
    ["family", "mam", "age"],
    ["family", "dad", "name"],
    ["family", "dad", "age"]
  ]);
});

test("objUtil getValue", () => {
  const obj = {
    name: "Test",
    parents: [
      {
        name: "Mam",
        age: 46
      },
      {
        name: "Dad",
        age: 46
      }
    ]
  };
  a.is(objUtil.getValue(obj, ["name"]), obj.name);
  a.is(objUtil.getValue(obj, ["parents", "0", "name"]), obj.parents[0]?.name);
  a.is(objUtil.getValue(obj, ["parents", "0", "age"]), obj.parents[0]?.age);
  a.is(objUtil.getValue(obj, ["parents", "1", "name"]), obj.parents[1]?.name);
  a.is(objUtil.getValue(obj, ["parents", "1", "age"]), obj.parents[1]?.age);
  a.equal(objUtil.getValue(obj, []), obj);
});

test("objUtil putValue", () => {
  a.equal(
    objUtil.putValue({}, ["parents", "0", "name"], "Mam"),
    { parents: { "0": { name: "Mam" } } }
  );
  a.equal(
    objUtil.putValue({ parents: [{ name: "Mam" }] }, ["parents", "1", "name"], "Dad"),
    { parents: [{ name: "Mam" }, { name: "Dad" }] }
  );
  a.equal(
    objUtil.putValue({ cars: [{ name: "Audi" }] }, ["cars", "0", "name"], "Volvo"),
    { cars: [{ name: "Volvo" }] }
  );
});

test("find paths", () => {
  objUtil.getValuePaths({
    private: {
      name: {
        type: "setup"
      }
    },
    public: {}
  }, (value) => value?.type === "reference");
});

test.run();