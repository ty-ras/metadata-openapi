/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import test from "ava";
import * as spec from "../provider";
import type { OpenAPIV3 as openapi } from "openapi-types";
import type * as md from "@ty-ras/metadata";
import type * as openapiMd from "../openapi";

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
    provider.getBuilder().getEndpointsMetadata({}, [], getSimpleEndpoint())(""),
  ]);
  t.deepEqual(doc, makeDoc(getSimpleEndpointOpenAPIPaths()));
});

test("Validate createOpenAPIProvider works for one complex endpoint", (t) => {
  t.plan(1);
  const provider = createProvider();
  const doc = provider.createFinalMetadata(docCreationArgs(), [
    provider.getBuilder().getEndpointsMetadata(
      {
        description: "Endpoint at some URL",
        summary: "Will perform its task",
      },
      [
        "/path/",
        {
          name: "parameter",
          decoder: "url-parameter",
          regExp: /.*/,
        },
      ],
      {
        GET: {
          requestHeadersSpec: {
            headerParam: {
              required: true,
              decoder: "request-header-contents",
            },
          },
          querySpec: {
            queryParam: {
              required: true,
              decoder: "query-contents",
            },
          },
          inputSpec: {
            contents: {
              string: "request-body-contents",
            },
          },
          outputSpec: {
            contents: {
              string: "response-body-contents",
            },
          },
          responseHeadersSpec: {
            responseHeaderParam: {
              required: true,
              encoder: "response-header-contents",
            },
          },
          metadataArguments: {
            urlParameters: {
              parameter: {
                description: "url-parameter-description",
              },
            },
            requestHeaders: {
              headerParam: {
                description: "request-header-description",
              },
            },
            queryParameters: {
              queryParam: {
                description: "query-parameter-description",
              },
            },
            body: {
              string: {
                example: "request-body-example",
              },
            },
            output: {
              description: "response-body-description",
              mediaTypes: {
                string: {
                  example: "response-body-example",
                },
              },
            },
            responseHeaders: {
              responseHeaderParam: {
                description: "response-header-description",
              },
            },
            operation: {
              description: "operation-description",
            },
          },
        },
      },
    )("/prefix"),
  ]);
  t.deepEqual(
    doc,
    makeDoc({
      "/prefix/path/{parameter}": {
        description: "Endpoint at some URL",
        summary: "Will perform its task",
        parameters: [
          {
            name: "parameter",
            in: "path",
            required: true,
            schema: { enum: ["url-parameter"], pattern: ".*" },
          },
        ],
        get: {
          description: "operation-description",
          responses: {
            "200": {
              description: "response-body-description",
              content: {
                string: {
                  example: "response-body-example",
                  schema: { enum: ["response-body-contents"] },
                },
              },
              headers: {
                responseHeaderParam: {
                  required: true,
                  schema: { enum: ["response-header-contents"] },
                },
              },
            },
          },
          parameters: [
            {
              in: "header",
              name: "headerParam",
              required: true,
              schema: { enum: ["request-header-contents"] },
            },
            {
              in: "query",
              name: "queryParam",
              required: true,
              schema: { enum: ["query-contents"] },
            },
          ],
          requestBody: {
            required: true,
            content: {
              string: {
                example: "request-body-example",
                schema: { enum: ["request-body-contents"] },
              },
            },
          },
        },
      },
    }),
  );
});

test("Validate createOpenAPIProvider passes security schemes to final result", (t) => {
  t.plan(1);
  const scheme: openapi.SecuritySchemeObject = {
    type: "http",
    scheme: "Basic",
  };
  const provider = createProvider().withRefinedContext({
    securitySchemes: [
      {
        name: "auth",
        scheme,
      },
    ],
  });
  t.deepEqual(
    provider.createFinalMetadata(docCreationArgs(), [
      provider.getBuilder().getEndpointsMetadata({}, [], getSimpleEndpoint())(
        "",
      ),
    ]),
    makeDoc(
      getSimpleEndpointOpenAPIPaths({
        operation: {
          security: [
            {
              auth: [],
            },
          ],
        },
      }),
      {
        components: {
          securitySchemes: {
            auth: scheme,
          },
        },
      },
    ),
  );
});

test("Validate createOpenAPIProvider checks for undefined possibility of response body", (t) => {
  t.plan(1);
  const provider = createProvider();
  t.deepEqual(
    provider.createFinalMetadata(docCreationArgs(), [
      provider
        .getBuilder()
        .getEndpointsMetadata(
          {},
          [],
          getSimpleEndpoint("undefined"),
        )(""),
    ]),
    makeDoc(
      getSimpleEndpointOpenAPIPaths({
        is204: true,
      }),
    ),
  );
});

const makeConst = (val: string): openapi.SchemaObject => ({
  enum: [val],
});

// In unit tests, our decoders and encoders are just strings
// In reality they will be data validators from io-ts/runtypes/zod libraries.
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

const makeDoc = (
  paths: openapi.PathsObject,
  additionalProps?: Omit<openapi.Document, "info" | "openapi" | "paths">,
): openapi.Document => ({
  ...(additionalProps ?? {}),
  info: docCreationArgs(),
  openapi: "3.0.3",
  paths,
});

const getSimpleEndpoint = (
  responseReturnType = "validator-as-a-string",
): Record<
  string,
  md.EndpointMetadataInformation<
    openapiMd.OpenAPIArguments,
    string,
    string,
    { string: string },
    { string: string }
  >
> => ({
  GET: {
    outputSpec: {
      contents: {
        string: responseReturnType,
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
});

const getSimpleEndpointOpenAPIPaths = (info?: {
  operation?: Omit<openapi.OperationObject, "responses">;
  is204?: boolean;
}): openapi.PathsObject => {
  const is204 = info?.is204 === true;
  const retVal: openapi.PathsObject = {
    "": {
      get: {
        ...(info?.operation ?? {}),
        responses: {
          [is204 ? 204 : 200]: {
            description: "outputDescription",
          },
        },
      },
    },
  };
  if (!is204) {
    (retVal as any)[""].get.responses[200].content = {
      string: {
        example: "ExampleOutput",
        schema: {
          enum: ["validator-as-a-string"],
        },
      },
    };
  }
  return retVal;
};
