/**
 * @file This file contains unit tests for functionality in file `../provider.ts`.
 */

import test, { ExecutionContext } from "ava";
import * as spec from "../provider";
import type { OpenAPIV3 as openapi } from "openapi-types";
import type * as md from "@ty-ras/metadata";
import type * as protocol from "@ty-ras/protocol";
import type * as hkt from "../hkt.types";

/* eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-argument,
  @typescript-eslint/no-unsafe-assignment,
  sonarjs/no-duplicate-string,
  sonarjs/cognitive-complexity
*/

test("Validate createOpenAPIProvider works for simplest usecase", (t) => {
  t.plan(1);
  const provider = createProvider();
  const doc = provider.createFinalMetadata(docCreationArgs(), []);
  t.deepEqual(
    doc,
    makeDoc({}),
    "Calling final metadata creation method right away should work.",
  );
});

test("Validate createOpenAPIProvider works for one simplest endpoint", (t) => {
  t.plan(1);
  const provider = createProvider();
  const doc = provider.createFinalMetadata(docCreationArgs(), [
    provider.afterDefiningURLEndpoints(getURLArgs(), getSimpleEndpoint()),
  ]);
  t.deepEqual(doc, makeDoc(getSimpleEndpointOpenAPIPaths()));
});

const complexEndpointTest = (
  t: ExecutionContext,
  customization: "none" | "record-only" | "description",
) => {
  t.plan(3);
  const provider = createProvider();
  const seen400Responses: Array<openapi.ResponseObject> = [];
  const seen422Responses: Array<openapi.ResponseObject> = [];
  const doc = provider.createFinalMetadata(docCreationArgs(), [
    provider.afterDefiningURLEndpoints(
      {
        md: {
          pathItem: {
            description: "Endpoint at some URL",
            summary: "Will perform its task",
          },
          url: {
            parameter: {
              description: "url-parameter-description",
            },
            parameter2: {
              description: "url-parameter2-description",
            },
          },
        },
        url: {
          parameter: {
            decoder: "url-parameter",
            regExp: /.*/,
          },
          parameter2: {
            decoder: "url-parameter2",
            regExp: /.*/,
          },
        },
        patternSpec: [
          "/prefix/path/",
          {
            name: "parameter",
          },
          "/middle-part/",
          {
            name: "parameter2",
          },
          "/suffix",
        ],
      },
      {
        GET: {
          spec: {
            method: "GET",
            stateInfo: {
              stateInfo: [],
              validator: () => {
                throw new Error("This method should never be called");
              },
            },
            requestHeaders: {
              headerParam: {
                required: true,
                decoder: "request-header-contents",
              },
            },
            query: {
              queryParam: {
                required: true,
                decoder: "query-contents",
              },
            },
            requestBody: {
              contents: {
                string: "request-body-contents",
              },
            },
            responseBody: {
              contents: {
                string: "response-body-contents",
              },
            },
            responseHeaders: {
              responseHeaderParam: {
                required: true,
                encoder: "response-header-contents",
              },
            },
          },
          md: {
            headers: {
              headerParam: {
                description: "request-header-description",
              },
            },
            query: {
              queryParam: {
                description: "query-parameter-description",
              },
            },
            requestBody: {
              string: {
                example: "request-body-example",
              },
            },
            responseBody: {
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
            customize400Response:
              customization === "none"
                ? undefined
                : (r) => {
                    seen400Responses.push(r);
                    if (customization !== "record-only") {
                      r.description = "Modified 400 response";
                      return r;
                    }
                  },
            customize422Response:
              customization === "none"
                ? undefined
                : (r) => {
                    seen422Responses.push(r);
                    if (customization !== "record-only") {
                      r.description = "Modified 422 response";
                      return r;
                    }
                  },
          } as (hkt.MetadataProviderHKT & {
            _argProtocolSpec: {
              method: "GET";
              responseBody: string;
              requestBody: string;
              responseHeaders: { responseHeaderParam: string };
              query: { queryParam: string };
              headerData: { headerParam: string };
            };
            _argProtocolHKT: ProtoEncodedHKT;
            _argResponseBodyContentTypes: "string";
          })["_getParameterWhenSpecifyingEndpoint"] as any,
        },
      } as any,
    ),
  ]);
  t.deepEqual(
    doc,
    makeDoc({
      "/prefix/path/{parameter}/middle-part/{parameter2}/suffix": {
        description: "Endpoint at some URL",
        summary: "Will perform its task",
        parameters: [
          {
            name: "parameter",
            in: "path",
            required: true,
            schema: { enum: ["url-parameter"], pattern: ".*" },
            description: "url-parameter-description",
          },
          {
            name: "parameter2",
            in: "path",
            required: true,
            schema: { enum: ["url-parameter2"], pattern: ".*" },
            description: "url-parameter2-description",
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
                  description: "response-header-description",
                },
              },
            },
            400: {
              description:
                customization === "description"
                  ? "Modified 400 response"
                  : "If URL path parameters or query or request headers fail validation.",
            },
            422: {
              description:
                customization === "description"
                  ? "Modified 422 response"
                  : "If request body validation fails.",
            },
          },
          parameters: [
            {
              in: "header",
              name: "headerParam",
              required: true,
              schema: { enum: ["request-header-contents"] },
              description: "request-header-description",
            },
            {
              in: "query",
              name: "queryParam",
              required: true,
              schema: { enum: ["query-contents"] },
              description: "query-parameter-description",
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
  t.deepEqual(
    seen400Responses,
    customization === "none"
      ? []
      : [
          {
            description:
              customization === "description"
                ? "Modified 400 response"
                : "If URL path parameters or query or request headers fail validation.",
          },
        ],
  );
  t.deepEqual(
    seen422Responses,
    customization === "none"
      ? []
      : [
          {
            description:
              customization === "description"
                ? "Modified 422 response"
                : "If request body validation fails.",
          },
        ],
  );
};

test(
  "Validate createOpenAPIProvider works for one complex endpoint, no customization",
  complexEndpointTest,
  "none",
);

test(
  "Validate createOpenAPIProvider works for one complex endpoint, record-only customization",
  complexEndpointTest,
  "record-only",
);

test(
  "Validate createOpenAPIProvider works for one complex endpoint, mutating customization",
  complexEndpointTest,
  "description",
);

test("Validate createOpenAPIProvider passes security schemes to final result", (t) => {
  t.plan(1);
  const scheme: openapi.SecuritySchemeObject = {
    type: "http",
    scheme: "Basic",
  };
  const provider = createProvider();
  t.deepEqual(
    provider.createFinalMetadata(docCreationArgs(), [
      provider.afterDefiningURLEndpoints(
        getURLArgs(),
        getSimpleEndpoint({
          stateInfo: [
            {
              isOptional: false,
              requirementData: [],
              schemeID: "auth",
              scheme,
            },
          ],
        }),
      ),
    ]),
    makeDoc(
      getSimpleEndpointOpenAPIPaths({
        operation: {
          responses: {
            401: {
              description: "Authentication failed",
            },
          },
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

test("Validate createOpenAPIProvider handles optional security schemes correctly", (t) => {
  t.plan(1);
  const scheme: openapi.SecuritySchemeObject = {
    type: "http",
    scheme: "Basic",
  };
  const provider = createProvider();
  t.deepEqual(
    provider.createFinalMetadata(docCreationArgs(), [
      provider.afterDefiningURLEndpoints(
        getURLArgs(),
        getSimpleEndpoint({
          stateInfo: [
            {
              isOptional: true,
              requirementData: [],
              schemeID: "auth",
              scheme,
            },
          ],
        }),
      ),
    ]),
    makeDoc(
      getSimpleEndpointOpenAPIPaths({
        operation: {
          responses: {
            401: {
              description: "Authentication failed",
            },
          },
          security: [
            {},
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
      provider.afterDefiningURLEndpoints(
        getURLArgs(),
        getSimpleEndpoint({ responseReturnType: "undefined" }),
      ),
    ]),
    makeDoc(
      getSimpleEndpointOpenAPIPaths({
        is204: true,
      }),
    ),
  );
});

test("Validate createOpenAPIProvider understands also potentially undefined response body", (t) => {
  t.plan(1);
  const provider = createProvider();
  const paths = getSimpleEndpointOpenAPIPaths({
    is204: true,
  });
  const responses = paths[""]?.get?.responses ?? {};
  if (!responses[204]) {
    t.fail("Expected 204 response to be present.");
  } else if (responses[200]) {
    t.fail("Did not expect 200 response to be present.");
  }
  responses[200] = getResponseFor200("maybeUndefined");
  t.deepEqual(
    provider.createFinalMetadata(docCreationArgs(), [
      provider.afterDefiningURLEndpoints(
        getURLArgs(),
        getSimpleEndpoint({ responseReturnType: "maybeUndefined" }),
      ),
    ]),
    makeDoc(paths),
  );
});

const makeConst = (val: string): openapi.SchemaObject => ({
  enum: [val],
});

// In unit tests, our decoders and encoders are just strings
// In reality they will be data validators from io-ts/runtypes/zod libraries.
const createProvider = () =>
  spec.createOpenAPIProviderGeneric<
    ProtoEncodedHKT,
    ValidatorHKT,
    StateHKT,
    "string",
    "string"
  >(
    (stateInfo) => ({
      securitySchemes:
        stateInfo.stateInfo.length > 0 ? [[...stateInfo.stateInfo]] : [],
      ifFailed: {
        description: "Authentication failed",
      },
    }),
    {
      getUndefinedPossibility: (decoderOrEncoder) =>
        decoderOrEncoder === "undefined"
          ? true
          : decoderOrEncoder === "maybeUndefined"
          ? undefined
          : false,
      stringDecoder: (decoder) => makeConst(decoder),
      stringEncoder: (encoder) => makeConst(encoder),
      decoders: {
        string: (decoder) => makeConst(decoder),
      },
      encoders: {
        string: (encoder) => makeConst(encoder),
      },
    },
  );

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
  opts: Partial<SimpleEndpointOptions> = DEFAULT_OPTS,
): Record<
  protocol.HttpMethod,
  md.SingleEndpointInformation<
    ProtoEncodedHKT,
    ValidatorHKT,
    StateHKT,
    hkt.MetadataProviderHKT
  >
> => {
  const { responseReturnType, stateInfo } = Object.assign(
    {},
    DEFAULT_OPTS,
    opts,
  );
  const info: md.SingleEndpointInformation<
    ProtoEncodedHKT,
    ValidatorHKT,
    StateHKT,
    hkt.MetadataProviderHKT
  > = {
    md: {
      operation: {},
      responseBody: {
        description: "outputDescription",
        mediaTypes: {
          string: {
            example: "ExampleOutput",
          },
        },
      },
    },
    spec: {
      method: "GET",
      responseBody: {
        contents: {
          string: responseReturnType,
        },
      },
      query: undefined,
      requestBody: undefined,
      requestHeaders: undefined,
      responseHeaders: undefined,
      stateInfo: {
        stateInfo,
        validator: () => {
          throw new Error("This method should never be called");
        },
      },
    },
  };
  return {
    GET: info,
  } as Record<protocol.HttpMethod, typeof info>;
};

const getSimpleEndpointOpenAPIPaths = (info?: {
  operation?: Omit<openapi.OperationObject, "responses"> & {
    responses?: openapi.OperationObject["responses"];
  };
  is204?: boolean;
}): openapi.PathsObject => {
  const is204 = info?.is204 === true;
  const retVal: openapi.PathsObject = {
    "": {
      get: {
        ...(info?.operation ?? {}),
        responses: {
          ...info?.operation?.responses,
          [is204 ? 204 : 200]: {
            description,
          },
        },
      },
    },
  };
  if (!is204) {
    (retVal as any)[""].get.responses[200] = getResponseFor200();
  }
  return retVal;
};

const description = "outputDescription";
const getResponseFor200 = (enumValue?: string): openapi.ResponseObject => ({
  description,
  content: {
    string: {
      example: "ExampleOutput",
      schema: {
        enum: [enumValue ?? "validator-as-a-string"],
      },
    },
  },
});

const getURLArgs = (): Parameters<
  md.MetadataProvider<
    ProtoEncodedHKT,
    ValidatorHKT,
    StateHKT,
    hkt.MetadataProviderHKT
  >["afterDefiningURLEndpoints"]
>[0] => ({
  patternSpec: [],
  url: {},
  md: {
    pathItem: {},
    url: {},
  },
});

type SimpleEndpointOptions = {
  responseReturnType: ValidatorHKT["_getDecoder"];
  stateInfo: StateHKT["_getStateInfo"];
} & Pick<
  hkt.MetadataParameterStatic,
  "customize400Response" | "customize422Response"
>;

const DEFAULT_OPTS = {
  responseReturnType: "validator-as-a-string",
  stateInfo: [],
} as const satisfies SimpleEndpointOptions;

import type * as data from "@ty-ras/data";
import type * as dataBE from "@ty-ras/data-backend";

interface ValidatorHKT extends data.ValidatorHKTBase {
  /**
   * This provides implementation for {@link data.ValidatorHKTBase._getEncoder}.
   * For the test setup, it is simply a string.
   */
  readonly _getEncoder: string;

  /**
   * This provides implementation for {@link data.ValidatorHKTBase._getDecoder}.
   * For the test setup, it is simply a string.
   */
  readonly _getDecoder: string;

  /**
   * This provides implementation for {@link data.ValidatorHKTBase._getDecodedType}.
   * For the test setup, it is simply a string.
   */
  readonly _getDecodedType: string;
}

interface ProtoEncodedHKT extends protocol.EncodedHKTBase {
  readonly typeEncoded: string;
}

interface StateHKT extends dataBE.StateHKTBase {
  readonly _getState: string;
  readonly _getStateInfo: ReadonlyArray<spec.OperationSecuritySchemeUsage>;
  readonly _getStateSpecBase: string;
}
