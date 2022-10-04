import test from "ava";
import * as spec from "../provider";
import * as json from "../jsonschema";
import type * as jsonSchema from "json-schema";
import type { OpenAPIV3 as openapi } from "openapi-types";

test("Validate createOpenAPIProvider works for simplest usecase", (t) => {
  t.plan(2);
  const provider = createProvider();
  const doc = provider.createFinalMetadata(docCreationArgs(), []);
  t.deepEqual(
    doc,
    makeDoc({}),
    "Calling final metadata creation method right away should work.",
  );
  t.deepEqual(
    provider.createFinalMetadata(docCreationArgs(), [
      provider.getBuilder().getEndpointsMetadata({}, [], {})(""),
    ]),
    doc,
    "Calling final metadata creation method with empty method set should produce same result as final metadata creation call right away.",
  );
});

test("Validate createOpenAPIProvider works for one simplest endpoint", (t) => {
  t.plan(1);
  const provider = createProvider();
  const doc = provider.createFinalMetadata(docCreationArgs(), [
    provider.getBuilder().getEndpointsMetadata({}, [], {
      GET: {
        outputSpec: {
          contents: {
            string: "validator-as-a-string",
          },
        },
        responseHeadersSpec: undefined,
        requestHeadersSpec: undefined,
        querySpec: undefined,
        inputSpec: undefined,
        metadataArguments: {
          urlParameters: {},
          output: {
            description: "outputDescription",
            mediaTypes: {
              string: {
                example: "ExampleOutput",
              },
            },
          },
          responseHeaders: {},
          requestHeaders: {},
          queryParameters: {},
          body: {},
          operation: {},
        },
      },
    })(""),
  ]);
  t.deepEqual(
    doc,
    makeDoc({
      "": {
        get: {
          responses: {
            200: {
              description: "outputDescription",
              content: {
                string: {
                  example: "ExampleOutput",
                  schema: {
                    enum: ["validator-as-a-string"],
                  },
                },
              },
            },
          },
        },
      },
    }),
  );
});

const makeConst = (val: string): openapi.SchemaObject => ({
  enum: [val],
});

const createProvider = () =>
  spec.createOpenAPIProvider<
    string,
    string,
    { string: string },
    { string: string }
  >({
    getUndefinedPossibility: (decoderOrEncoder) =>
      decoderOrEncoder === "undefined",
    stringDecoder: (decoder) => makeConst(decoder),
    stringEncoder: (encoder) => makeConst(encoder),
    decoders: {
      string: (decoder) => makeConst(decoder),
    },
    encoders: {
      string: (encoder) => makeConst(encoder),
    },
  });

// Function instead of constant to avoid testable code to e.g. modify it
const docCreationArgs = (): openapi.InfoObject => ({
  title: "Title",
  version: "0.0.1",
});

const makeDoc = (paths: openapi.PathsObject): openapi.Document => ({
  info: docCreationArgs(),
  openapi: "3.0.3",
  paths,
});
