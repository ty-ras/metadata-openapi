/**
 * @file This file contains unit tests for functionality in file `../jsonschema.ts`.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import test from "ava";
import * as spec from "../jsonschema";
import type * as jsonSchema from "json-schema";

test("Validate convertToOpenAPISchemaObject works for booleans", (t) => {
  t.plan(2);
  t.deepEqual(spec.convertToOpenAPISchemaObject(true), {});
  t.deepEqual(spec.convertToOpenAPISchemaObject(false), { not: {} });
});

test("Validate convertToOpenAPISchemaObject transforms consts correctly", (t) => {
  t.plan(2);
  t.deepEqual(
    spec.convertToOpenAPISchemaObject({
      const: "const",
    }),
    { enum: ["const"] },
  );
  t.deepEqual(
    spec.convertToOpenAPISchemaObject({
      const: undefined,
    }),
    {},
  );
});

test("Validate convertToOpenAPISchemaObject does not modify original one if there is nothing to modify", (t) => {
  t.plan(1);
  const original: jsonSchema.JSONSchema7Definition = {
    anyOf: [
      {
        enum: ["one"],
      },
      {
        enum: ["two"],
      },
    ],
    properties: {
      prop: {
        enum: ["three"],
      },
    },
    propertyNames: {
      enum: ["prop"],
    },
    dependencies: {
      myDep: ["theDep"],
    },
  };
  const clone = JSON.parse(JSON.stringify(original));
  t.deepEqual(spec.convertToOpenAPISchemaObject(original), clone);
});
