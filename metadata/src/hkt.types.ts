/**
 * @file This file contains types related to implementing the generic [HKT](https://www.matechs.com/blog/encoding-hkts-in-typescript-once-again) of TyRAS metadata package {@link md.MetadataProviderHKTBase}.
 */

import type * as protocol from "@ty-ras/protocol";
import type * as md from "@ty-ras/metadata";
import type {
  // OpenAPIV3_1 is a bit uncompleted still, and many types are unusuable because the SchemaObject is changed, but not all the places are updated in type definitions where they should be.
  // Example:
  // the V3.1 ParameterObject is specified to be exactly same as V3.0 ParameterObject
  // However, the 'schema' property of ParameterObject is reference to SchemaObject, which is different between V3.0 and V3.1
  // Therefore, the V3.1 should also modify type of 'schema' property of ParameterObject, but it does not.
  OpenAPIV3 as openapi,
} from "openapi-types";

/**
 * This interface "implements" the generic [HKT](https://www.matechs.com/blog/encoding-hkts-in-typescript-once-again), {@link md.MetadataProviderHKTBase}, to provide OpenAPI-specific metadata types.
 */
export interface MetadataProviderHKT extends md.MetadataProviderHKTBase {
  /**
   * This property "implements" the {@link md.MetadataProviderHKTBase._getParameterWhenSpecifyingURL} property in order to provide functionality for {@link md.MaterializeParameterWhenSpecifyingURL} type.
   */
  readonly _getParameterWhenSpecifyingURL: MetadataParameterURL<
    this["_argURLParameters"]
  >;

  /**
   * This property "implements" the {@link md.MetadataProviderHKTBase._getParameterWhenSpecifyingEndpoint} property in order to provide functionality for {@link md.MaterializeParameterWhenSpecifyingEndpoint} type.
   */
  readonly _getParameterWhenSpecifyingEndpoint: MetadataParameterStatic &
    (this["_argProtocolSpec"] extends protocol.ProtocolSpecCore<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
      infer TResponseBody
    >
      ? MetadataParameterResponseBody<
          this["_argProtocolHKT"] extends protocol.EncodedHKTBase
            ? this["_argProtocolHKT"]
            : protocol.EncodedHKTBase,
          TResponseBody,
          this["_argResponseBodyContentTypes"]
        >
      : {
          [P in keyof MetadataParameterResponseBody<
            never,
            never,
            never
          >]?: never;
        }) &
    (this["_argProtocolSpec"] extends protocol.ProtocolSpecRequestBody<
      infer TRequestBody
    >
      ? MetadataParameterRequestBody<
          this["_argProtocolHKT"] extends protocol.EncodedHKTBase
            ? this["_argProtocolHKT"]
            : protocol.EncodedHKTBase,
          TRequestBody,
          this["_argRequestBodyContentTypes"]
        >
      : {
          [P in keyof MetadataParameterRequestBody<
            never,
            never,
            never
          >]?: never;
        }) &
    (this["_argProtocolSpec"] extends protocol.ProtocolSpecQuery<
      infer TQueryData
    >
      ? MetadataParameterQuery<TQueryData>
      : { [P in keyof MetadataParameterQuery<never>]?: never }) &
    (this["_argProtocolSpec"] extends protocol.ProtocolSpecHeaderData<
      infer TRequestHeaders
    >
      ? MetadataParameterRequestHeaders<TRequestHeaders>
      : { [P in keyof MetadataParameterRequestHeaders<never>]?: never }) &
    (this["_argProtocolSpec"] extends protocol.ProtocolSpecResponseHeaders<
      infer TResponseHeaders
    >
      ? MetadataParameterResponseHeaders<TResponseHeaders>
      : { [P in keyof MetadataParameterResponseHeaders<never>]?: never });

  /**
   * This property "implements" the {@link md.MetadataProviderHKTBase._getReturnWhenSpecifyingEndpoint} property in order to provide functionality for {@link md.MaterializeReturnWhenSpecifyingEndpoint} type.
   */
  readonly _getReturnWhenSpecifyingEndpoint: MetadataReturnForURLPattern;

  /**
   * This property "implements" the {@link md.MetadataProviderHKTBase._getParameterWhenCreatingEndpoints} property in order to provide functionality for {@link md.MaterializeParameterWhenCreatingEndpoints} type.
   */
  readonly _getParameterWhenCreatingEndpoints: openapi.InfoObject;

  /**
   * This property "implements" the {@link md.MetadataProviderHKTBase._getReturnWhenCreatingEndpoints} property in order to provide functionality for {@link md.MaterializeReturnWhenCreatingEndpoints} type.
   */
  readonly _getReturnWhenCreatingEndpoints: FinalMetadata;
}

/**
 * This type is used by {@link MetadataProviderHKT._getParameterWhenSpecifyingURL} for specifying what is needed when creating OpenAPI-enabled BE endpoint builder for single URL path pattern.
 */
export type MetadataParameterURL<TURLData> = {
  pathItem: Omit<
    openapi.PathItemObject,
    openapi.HttpMethods | "$ref" | "parameters"
  >;
} & (undefined extends TURLData
  ? { url?: never }
  : {
      url: {
        [P in keyof TURLData]-?: Pick<
          openapi.ParameterObject,
          "description" | "deprecated"
        >;
      };
    });

/**
 * This type is used by {@link MetadataProviderHKT._getParameterWhenSpecifyingEndpoint} for specifying what is needed when creating OpenAPI-enabled BE endpoint for certain URL path and HTTP method.
 * This type in particular specifies information which requires no generic type arguments, hence suffix `Static`.
 */
export type MetadataParameterStatic = {
  /**
   * The properties related to {@link openapi.OperationObject}, which are not mechanically computable from what TyRAS framework knows about the endpoint.
   */
  operation: Omit<
    openapi.OperationObject,
    "parameters" | "requestBody" | "responses" | "security"
  >;

  /**
   * This optional callback is used by OpenAPI metadata provider when BE endpoint has HTTP URL, query, or request header data parameters.
   * It allows to customize the {@link openapi.ResponseObject} that will be returned when any of the following parameters fails data validation, and HTTP response code `400` will be returned to the caller.
   * @param response The OpenAPI {@link openapi.ResponseObject} auto-generated by metadata provider.
   * @returns The modified {@link openapi.ResponseObject}, or `undefined` if no modifications are needed.
   */
  customize400Response?: (
    response: openapi.ResponseObject,
  ) => openapi.ResponseObject | undefined;

  /**
   * This optional callback is used by OpenAPI metadata provider when BE endpoint has HTTP request body data.
   * It allows to customize the {@link openapi.ResponseObject} that will be returned when request body data validation fails, and HTTP response code `422` will be returned to the caller.
   * @param response The OpenAPI {@link openapi.ResponseObject} auto-generated by metadata provider.
   * @returns The modified {@link openapi.ResponseObject}, or `undefined` if no modifications are needed.
   */
  customize422Response?: (
    response: openapi.ResponseObject,
  ) => openapi.ResponseObject | undefined;
};

/**
 * This type is used by {@link MetadataProviderHKT._getParameterWhenSpecifyingEndpoint} for specifying what is needed when creating OpenAPI-enabled BE endpoint for certain URL path and HTTP method.
 * This type in particular specifies information about response body.
 */
export type MetadataParameterResponseBody<
  TProtocolEncodedHKT extends protocol.EncodedHKTBase,
  TResponseBody,
  TResponseBodyContentTypes,
> = {
  /**
   * OpenAPI-specific information about response body of this endpoint.
   */
  responseBody: Pick<openapi.ResponseObject, "description"> & {
    mediaTypes: {
      [P in TResponseBodyContentTypes & string]: MetadataParameterMediaType<
        protocol.EncodedOf<TProtocolEncodedHKT, TResponseBody>
      >;
    };
  };
};

/**
 * This type is used by {@link MetadataProviderHKT._getParameterWhenSpecifyingEndpoint} for specifying what is needed when creating OpenAPI-enabled BE endpoint for certain URL path and HTTP method.
 * This type in particular specifies information about HTTP request body.
 */
export type MetadataParameterRequestBody<
  TProtocolEncodedHKT extends protocol.EncodedHKTBase,
  TRequestBody,
  TRequestBodyContentTypes,
> = {
  /**
   * OpenAPI-specific information about request body of this endpoint.
   */
  requestBody: {
    [P in TRequestBodyContentTypes & string]: MetadataParameterMediaType<
      protocol.EncodedOf<TProtocolEncodedHKT, TRequestBody>
    >;
  };
};

/**
 * This type is used by {@link MetadataProviderHKT._getParameterWhenSpecifyingEndpoint} for specifying what is needed when creating OpenAPI-enabled BE endpoint for certain URL path and HTTP method.
 * This type in particular specifies information about HTTP request query data parameters.
 */
export type MetadataParameterQuery<TQueryData> = {
  /**
   * OpenAPI-specific information about each query data parameter of this endpoint.
   */
  query: {
    [P in keyof TQueryData]-?: MetadataParameterStringBased;
  };
};

/**
 * This type is used by {@link MetadataProviderHKT._getParameterWhenSpecifyingEndpoint} for specifying what is needed when creating OpenAPI-enabled BE endpoint for certain URL path and HTTP method.
 * This type in particular specifies information about HTTP request header data.
 */
export type MetadataParameterRequestHeaders<TRequestHeaders> = {
  /**
   * OpenAPI-specific information about each request header data parameter of this endpoint.
   */
  headers: {
    [P in keyof TRequestHeaders]-?: MetadataParameterStringBased;
  };
};

/**
 * This type is used by {@link MetadataProviderHKT._getParameterWhenSpecifyingEndpoint} for specifying what is needed when creating OpenAPI-enabled BE endpoint for certain URL path and HTTP method.
 * This type in particular specifies information about HTTP response header data.
 */
export type MetadataParameterResponseHeaders<TResponseHeaders> = {
  /**
   * OpenAPI-specific information about each response header data parameter of this endpoint.
   */
  responseHeaders: {
    [P in keyof TResponseHeaders]-?: MetadataParameterStringBased;
  };
};

/**
 * This type is used by {@link MetadataProviderHKT._getReturnWhenSpecifyingEndpoint} for specifying intermediate data type which binds information about one or more BE endpoints behind a single URL path pattern.
 */
export type MetadataReturnForURLPattern = {
  /**
   * The URL path pattern in textual format as specified in OpenAPI.
   * Will be used as key in {@link openapi.PathsObject}.
   */
  pattern: string;

  /**
   * The {@link openapi.PathItemObject} constructed from the BE endpoints.
   */
  pathItem: openapi.PathItemObject;

  /**
   * The {@link openapi.SecuritySchemeObject}s constructed from the BE endpoints.
   */
  securitySchemes: Record<string, openapi.SecuritySchemeObject>;
};

/**
 * This type contains properties of non-mechanically computed OpenAPI information common for all parameters of BE endpoints.
 * @see openapi.ParameterObject
 */
export type MetadataParameterStringBased = Pick<
  openapi.ParameterObject,
  "description" | "deprecated"
>;

/**
 * This type contains properties of non-mechanically computed OpenAPI information common for request/response bodies.
 * @see openapi.MediaTypeObject
 */
export interface MetadataParameterMediaType<T> {
  /**
   * This is like `example` property of {@link openapi.MediaTypeObject}, but it is typed via generic parameter.
   */
  example?: T;
}

/**
 * This type is used by {@link MetadataProviderHKT._getReturnWhenCreatingEndpoints} for specifying data type for final metadata object containing information about REST API constituted from all BE endpoints.
 */
export type FinalMetadata = openapi.Document;
