/**
 * @file This types-only file contains type definitions specializing generic TyRAS metadata-related types for OpenAPI.
 */

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

/**
 * This type materializes the {@link md.HKTArg}, which is [higher-kinded-type](https://www.matechs.com/blog/encoding-hkts-in-typescript-once-again), by introducing the logic of constructing final type of required non-mechanically computed OpenAPI information for each single BE endpoint (url path + method combination).
 * @see OpenAPIArgumentsStatic
 * @see OpenAPIArgumentsURLData
 * @see OpenAPIArgumentsRequestHeaders
 * @see OpenAPIArgumentsResponseHeaders
 * @see OpenAPIArgumentsURLQuery
 * @see OpenAPIArgumentsRequestBody
 * @see OpenAPIArgumentsResponseBody
 */
export interface OpenAPIArguments extends md.HKTArg {
  /**
   * This property will be used to construct the final type containing required non-mechanically computed OpenAPI information for each single BE endpoint (url path + method combination).
   * @see OpenAPIArgumentsStatic
   * @see OpenAPIArgumentsURLData
   * @see OpenAPIArgumentsRequestHeaders
   * @see OpenAPIArgumentsResponseHeaders
   * @see OpenAPIArgumentsURLQuery
   * @see OpenAPIArgumentsRequestBody
   * @see OpenAPIArgumentsResponseBody
   */
  readonly type: OpenAPIArgumentsStatic &
    OpenAPIArgumentsURLData<this["_TURLData"]> &
    OpenAPIArgumentsRequestHeaders<this["_TRequestHeaders"]> &
    OpenAPIArgumentsResponseHeaders<this["_TResponseHeaders"]> &
    OpenAPIArgumentsURLQuery<this["_TQuery"]> &
    OpenAPIArgumentsRequestBody<this["_TBody"]> &
    OpenAPIArgumentsResponseBody<this["_TOutput"]>;
}

/**
 * This type contains properties of non-mechanically computed OpenAPI information common for BE endpoints.
 */
export type OpenAPIArgumentsStatic = {
  /**
   * The properties related to {@link openapi.OperationObject}, which are not mechanically computable from what TyRAS framework knows about the endpoint.
   */
  operation: Omit<
    openapi.OperationObject,
    "parameters" | "requestBody" | "responses" | "security"
  >;
};

/**
 * This type contains properties of non-mechanically computed OpenAPI information common for all parameters of BE endpoints.
 * @see openapi.ParameterObject
 */
export type OpenAPIParameterInput = Pick<
  openapi.ParameterObject,
  "description" | "deprecated"
>;

/**
 * This type contains properties of non-mechanically computed OpenAPI information common for request/response bodies.
 * @see openapi.MediaTypeObject
 */
export interface OpenAPIParameterMedia<T> {
  /**
   * This is like `example` property of {@link openapi.MediaTypeObject}, but it is typed via generic parameter.
   */
  example?: T;
}

/**
 * This type contains OpenAPI-specific information about all the parameters of the BE endpoint encoded in URL path string.
 * @see OpenAPIParameterInput
 */
export interface OpenAPIArgumentsURLData<TURLData> {
  /**
   * The OpenAPI-specific information about all the parameters of the BE endpoint encoded in URL path string.
   */
  urlParameters: { [P in keyof TURLData]-?: OpenAPIParameterInput };
}

/**
 * This type contains OpenAPI-specific information about all the request headers used as data in the BE endpoint.
 * @see OpenAPIParameterInput
 */
export interface OpenAPIArgumentsRequestHeaders<TResponseHeaders> {
  /**
   * The OpenAPI-specific information about all the request headers used as data in the BE endpoint.
   */
  requestHeaders: { [P in keyof TResponseHeaders]-?: OpenAPIParameterInput };
}

/**
 * This type contains OpenAPI-specific information about all the response headers returned by the BE endpoint.
 * @see OpenAPIParameterInput
 */
export interface OpenAPIArgumentsResponseHeaders<TResponseHeaders> {
  /**
   * The OpenAPI-specific information about all the response headers returned by the BE endpoint.
   */
  responseHeaders: { [P in keyof TResponseHeaders]-?: OpenAPIParameterInput };
}

/**
 * This type contains OpenAPI-specific information about all the query parameters of the BE endpoint encoded in URL string.
 * @see OpenAPIParameterInput
 */
export interface OpenAPIArgumentsURLQuery<TQuery> {
  /**
   * The OpenAPI-specific information about all the query parameters of the BE endpoint encoded in URL string.
   */
  queryParameters: {
    [P in keyof TQuery]-?: OpenAPIParameterInput;
  };
}

/**
 * This type contains OpenAPI-specific information about all the request body media types accepted by BE endpoint.
 * @see OpenAPIParameterMedia
 */
export interface OpenAPIArgumentsRequestBody<TBody> {
  /**
   * The OpenAPI-specific information about all the request body media types accepted by BE endpoint.
   */
  requestBody: { [P in keyof TBody]-?: OpenAPIParameterMedia<TBody[P]> };
}

/**
 * This type contains OpenAPI-specific information about all the response body media types that can be returned by BE endpoint.
 * @see OpenAPIParameterMedia
 */
export interface OpenAPIArgumentsResponseBody<TOutput> {
  /**
   * The contains OpenAPI-specific information about all the response body media types that can be returned by BE endpoint.
   */
  responseBody: Pick<openapi.ResponseObject, "description"> & {
    mediaTypes: {
      [P in keyof TOutput]: OpenAPIParameterMedia<TOutput[P]>;
    };
  };
}

/**
 * The OpenAPI-specific additional metadata, needed to construct the final {@link openapi.Document}.
 */
export interface OpenAPIEndpointStateInfo {
  /**
   * The information about security schemes for single {@link openapi.OperationObject}.
   */
  securitySchemes: Array<{
    name: string;
    scheme: openapi.SecuritySchemeObject;
  }>;
}

/**
 * The OpenAPI-specific non-mechanically computed data needed when constructing a {@link openapi.PathItemObject}.
 */
export type OpenAPIPathItemArg = Omit<
  openapi.PathItemObject,
  openapi.HttpMethods | "$ref" | "parameters"
>;

/**
 * The OpenAPI-specific information needed when creating final {@link openapi.PathsObject} of the resulting {@link openapi.Document}.
 */
export interface PathsObjectInfo {
  /**
   * The textual representation of URL path pattern.
   */
  urlPath: string;

  /**
   * The {@link openapi.PathItemObject}.
   */
  pathObject: openapi.PathItemObject;
}

/**
 * This type specializes the generic TyRAS {@link md.MetadataProvider} to lock in the OpenAPI-specific generic arguments.
 * The data validator types are left to be parametrizable.
 */
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

/**
 * This is OpenAPI-specific generic parameter used to parametrize {@link md.MetadataProvider} via {@link OpenAPIMetadataProvider}.
 */
export type OpenAPIEndpointMD = PathsObjectInfo | undefined;

/**
 * This is OpenAPI-specific generic parameter used to parametrize {@link md.MetadataProvider} via {@link OpenAPIMetadataProvider}.
 * It signifies that the type of the final metadata object for whole REST API server is {@link openapi.Document}.
 */
export type FinalMetadata = openapi.Document;
