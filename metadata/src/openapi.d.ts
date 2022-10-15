import type * as md from "@ty-ras/metadata";
import type * as data from "@ty-ras/data-backend";

// The openapi-types is pretty good, but not perfect
// E.g. the ParameterObject's "in" property is just "string", instead of "'query' | 'header' | 'path' | 'cookie'", as mentioned in spec.
// Maybe define own OpenAPI types at some point, altho probably no need, as these types can be modified with things like Omit and Pick.
import type {
  // OpenAPIV3_1 is a bit uncompleted still, and many types are unusuable because the SchemaObject is changed, but not all the places are updated in type definitions where they should be.
  // Example:
  // the V3.1 ParameterObject is specified to be exactly same as V3.0 ParameterObject
  // However, the 'schema' property of ParameterObject is reference to SchemaObject, which is different between V3.0 and V3.1
  // Therefore, the V3.1 should also modify type of 'schema' property of ParameterObject, but it does not.
  OpenAPIV3 as openapi,
} from "openapi-types";

export interface OpenAPIArguments extends md.HKTArg {
  readonly type: OpenAPIArgumentsStatic &
    OpenAPIArgumentsURLData<this["_TURLData"]> &
    OpenAPIArgumentsRequestHeaders<this["_TRequestHeaders"]> &
    OpenAPIArgumentsResponseHeaders<this["_TResponseHeaders"]> &
    OpenAPIArgumentsQuery<this["_TQuery"]> &
    OpenAPIArgumentsInput<this["_TBody"]> &
    OpenAPIArgumentsOutput<this["_TOutput"]>;
}

type OpenAPIArgumentsStatic = {
  operation: Omit<
    openapi.OperationObject,
    "parameters" | "requestBody" | "responses" | "security"
  >;
};

type OpenAPIParameterInput = Pick<
  openapi.ParameterObject,
  "description" | "deprecated"
>;

interface OpenAPIParameterMedia<T> {
  example?: T;
}

interface OpenAPIArgumentsURLData<TURLData> {
  urlParameters: { [P in keyof TURLData]-?: OpenAPIParameterInput };
}

interface OpenAPIArgumentsRequestHeaders<TResponseHeaders> {
  requestHeaders: { [P in keyof TResponseHeaders]-?: OpenAPIParameterInput };
}

interface OpenAPIArgumentsResponseHeaders<TResponseHeaders> {
  responseHeaders: { [P in keyof TResponseHeaders]-?: OpenAPIParameterInput };
}

interface OpenAPIArgumentsQuery<TQuery> {
  queryParameters: {
    [P in keyof TQuery]-?: OpenAPIParameterInput;
  };
}

interface OpenAPIArgumentsInput<TBody> {
  body: { [P in keyof TBody]-?: OpenAPIParameterMedia<TBody[P]> };
}

interface OpenAPIArgumentsOutput<TOutput> {
  output: Pick<openapi.ResponseObject, "description"> & {
    mediaTypes: {
      [P in keyof TOutput]: OpenAPIParameterMedia<TOutput[P]>;
    };
  };
}

export interface OpenAPIEndpointStateInfo {
  securitySchemes: Array<{
    name: string;
    scheme: openapi.SecuritySchemeObject;
  }>;
}

export type OpenAPIPathItemArg = Omit<
  openapi.PathItemObject,
  openapi.HttpMethods | "$ref" | "parameters"
>;

export interface PathsObjectInfo {
  urlPath: string;
  pathObject: openapi.PathItemObject;
}

export type OpenAPIMetadataProvider<
  TStringDecoder,
  TStringEncoder,
  TOutputContents extends data.TOutputContentsBase,
  TInputContents extends data.TInputContentsBase,
> = md.MetadataProvider<
  OpenAPIArguments,
  OpenAPIPathItemArg,
  OpenAPIEndpointMD,
  TStringDecoder,
  TStringEncoder,
  TOutputContents,
  TInputContents,
  OpenAPIEndpointStateInfo,
  openapi.InfoObject,
  FinalMetadata
>;

export type OpenAPIEndpointMD = PathsObjectInfo | undefined;

export type FinalMetadata = openapi.Document;
