/**
 * @file This file contains function to create {@link types.OpenAPIMetadataProvider} which will be able to generate OpenAPI {@link openapi.Document} containing schema and other information from TyRAS endpoints.
 */

import type * as protocol from "@ty-ras/protocol";
import * as data from "@ty-ras/data";
import type * as md from "@ty-ras/metadata";
import type * as dataBE from "@ty-ras/data-backend";
import type * as ep from "@ty-ras/endpoint";
import type * as jsonSchemaPlugin from "@ty-ras/metadata-jsonschema";

import { OpenAPIV3 as openapi } from "openapi-types";
import type * as types from "./hkt.types";

/**
 * Creates a new instance of {@link types.OpenAPIMetadataProvider} with necesary information about how to convert native data validators into JSON schemas.
 * This is meant to be used by other TyRAS libraries and not by client code directly.
 * @param getSecurityObjects Callback to get security object information from state specification.
 * @param root0 The {@link jsonSchemaPlugin.SupportedJSONSchemaFunctionality} with necessary information about how to convert native data validators into JSON schemas.
 * @param root0.stringDecoder Privately deconstructed variable.
 * @param root0.stringEncoder Privately deconstructed variable.
 * @param root0.encoders Privately deconstructed variable.
 * @param root0.decoders Privately deconstructed variable.
 * @param root0.getUndefinedPossibility Privately deconstructed variable.
 * @returns A new instance of {@link types.OpenAPIMetadataProvider}.
 */
export const createOpenAPIProviderGeneric = <
  TProtocolEncodedHKT extends protocol.EncodedHKTBase,
  TValidatorHKT extends data.ValidatorHKTBase,
  TStateHKT extends dataBE.StateHKTBase,
  TRequestBodyContentTypes extends string,
  TResponseBodyContentTypes extends string,
>(
  getSecurityObjects: GetOperationSecurityInformation<TStateHKT>,
  {
    stringDecoder,
    stringEncoder,
    encoders,
    decoders,
    getUndefinedPossibility,
  }: jsonSchemaPlugin.SupportedJSONSchemaFunctionality<
    openapi.SchemaObject,
    TValidatorHKT,
    TRequestBodyContentTypes,
    TResponseBodyContentTypes
  >,
): md.MetadataProvider<
  TProtocolEncodedHKT,
  TValidatorHKT,
  TStateHKT,
  types.MetadataProviderHKT
> => {
  const generateEncoderJSONSchema = (contentType: string, encoder: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    encoders[contentType as TResponseBodyContentTypes](encoder as any, true);
  const generateDecoderJSONSchema = (contentType: string, encoder: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    decoders[contentType as TRequestBodyContentTypes](encoder as any, true);
  const getAnyUndefinedPossibility = (decoderOrEncoder: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    getUndefinedPossibility(decoderOrEncoder as any);
  return {
    afterDefiningURLEndpoints: (
      {
        patternSpec,
        md: { pathItem: pathItemData, url: urlParameters },
        url: urlMD,
      },
      endpoints,
    ) => {
      const hasURLParameters =
        urlParameters !== undefined && Object.keys(urlParameters).length > 0;

      const securitySchemes: Record<string, openapi.SecuritySchemeObject> = {};
      const pathItem: openapi.PathItemObject = {
        ...pathItemData,
        ...Object.fromEntries(
          Object.entries(endpoints).map(
            ([methodUppercased, { spec, md: operationData }]) => [
              methodUppercased.toLowerCase(),
              getOperationObject(
                getAnyUndefinedPossibility,
                generateDecoderJSONSchema,
                generateEncoderJSONSchema,
                stringDecoder,
                stringEncoder,
                getSecurityObjects,
                spec,
                operationData as FullEndpointSpecMDParameter<TProtocolEncodedHKT>,
                securitySchemes,
                hasURLParameters,
              ),
            ],
          ),
        ),
      };
      if (hasURLParameters) {
        pathItem.parameters = getURLParameters(
          stringDecoder,
          urlMD,
          urlParameters,
          patternSpec,
        );
      }
      return {
        pattern: getUrlPathString(patternSpec),
        pathItem,
        securitySchemes,
      };
    },
    createFinalMetadata: (info, paths) => {
      const components: openapi.ComponentsObject = {};
      // TODO aggressively cache all cacheable things to components
      const allSecuritySchemes: Record<string, openapi.SecuritySchemeObject> =
        {};
      paths.forEach(({ securitySchemes }) => {
        Object.assign(allSecuritySchemes, securitySchemes);
      });
      if (Object.keys(allSecuritySchemes).length > 0) {
        components.securitySchemes = allSecuritySchemes;
      }
      const doc: openapi.Document = {
        openapi: "3.0.3",
        info,
        paths: Object.fromEntries(
          paths.map(({ pattern, pathItem }) => [pattern, pathItem]),
        ),
      };
      if (Object.keys(components).length > 0) {
        doc.components = components;
      }
      return doc;
    },
  };
};

const getURLParameters = <TValidatorHKT extends data.ValidatorHKTBase>(
  stringDecoder: StringDecoder<TValidatorHKT>,
  urlSpec: dataBE.URLParameterValidatorSpecMetadata<
    protocol.TTextualDataBase,
    TValidatorHKT
  >,
  urlObject: types.MetadataParameterURL<protocol.TURLDataBase>["url"],
  patternSpec: md.URLPathPatternInfo,
) => {
  const urlParamObjects = Object.entries(urlObject).map(
    ([name, urlParam]): openapi.ParameterObject => ({
      ...urlParam,
      name,
      in: "path",
      required: true,
      schema: {
        ...stringDecoder(urlSpec[name].decoder, true),
        pattern: urlSpec[name].regExp.source,
      },
    }),
  );
  urlParamObjects.sort(
    (x, y) =>
      patternSpec.findIndex((v) => typeof v !== "string" && v.name === x.name) -
      patternSpec.findIndex((v) => typeof v !== "string" && v.name === y.name),
  );
  return urlParamObjects;
};

const getOperationObject = <
  TProtocolEncodedHKT extends protocol.EncodedHKTBase,
  TValidatorHKT extends data.ValidatorHKTBase,
  TStateHKT extends dataBE.StateHKTBase,
>(
  getUndefinedPossibility: jsonSchemaPlugin.GetUndefinedPossibility<
    | data.AnyDecoderGeneric<TValidatorHKT>
    | data.AnyEncoderGeneric<TValidatorHKT>
  >,
  generateDecoderJSONSchema: GenerateAnyJSONSchema,
  generateEncoderJSONSchema: GenerateAnyJSONSchema,
  stringDecoder: StringDecoder<TValidatorHKT>,
  stringEncoder: StringEncoder<TValidatorHKT>,
  getSecurityObjects: GetOperationSecurityInformation<TStateHKT>,
  {
    query,
    requestBody,
    requestHeaders,
    responseBody,
    responseHeaders,
    stateInfo,
  }: md.SingleEndpointSpecMetadata<TValidatorHKT, TStateHKT>,
  {
    operation,
    requestBody: requestBodyObject,
    query: queryObject,
    responseBody: responseBodyObject,
    headers: requestHeadersObject,
    responseHeaders: responseHeadersObject,
    customize400Response,
    customize422Response,
  }: FullEndpointSpecMDParameter<TProtocolEncodedHKT>,
  securitySchemes: Record<string, openapi.SecuritySchemeObject>,
  hasURLParameters: boolean,
) => {
  const responseObjects = getResponseBody(
    getUndefinedPossibility,
    generateEncoderJSONSchema,
    responseBody,
    responseBodyObject,
  );
  handleResponseHeaders(
    stringEncoder,
    responseHeaders,
    responseHeadersObject,
    responseObjects,
  );
  const operationObject: openapi.OperationObject = {
    ...operation,
    responses: responseObjects,
  };
  const parameters: Array<openapi.ParameterObject> = [];
  parameters.push(
    ...getRequestHeaders(stringDecoder, requestHeaders, requestHeadersObject),
  );
  const prevLength = parameters.length;
  const hasRequestHeaders = prevLength > 0;
  parameters.push(...getQuery(stringDecoder, query, queryObject));
  const hasQueryParameters = parameters.length > prevLength;
  if (parameters.length > 0) {
    operationObject.parameters = parameters;
  }

  // Request body
  if (requestBody && requestBodyObject) {
    operationObject.requestBody = getRequestBody(
      getUndefinedPossibility,
      generateDecoderJSONSchema,
      requestBody,
      requestBodyObject,
    );
    const response422: openapi.ResponseObject = {
      description: "If request body validation fails.",
    };
    operationObject.responses[422] =
      customize422Response?.(response422) ?? response422;
  }

  const security = getSecurityObjects(stateInfo);
  if (security && security.securitySchemes.length > 0) {
    let optionalSecuritySchemeSeen = false;
    operationObject.security = security.securitySchemes.map((schemeUsages) =>
      schemeUsages.reduce<openapi.SecurityRequirementObject>(
        (sec, { schemeID, requirementData, isOptional }) => {
          optionalSecuritySchemeSeen = optionalSecuritySchemeSeen || isOptional;
          sec[schemeID] = requirementData;
          return sec;
        },
        {},
      ),
    );
    if (optionalSecuritySchemeSeen) {
      // This is how security optionality is defined in OpenAPI
      // https://stackoverflow.com/questions/47659324/how-to-specify-an-endpoints-authorization-is-optional-in-openapi-v3
      operationObject.security?.unshift({});
    }
    operationObject.responses[401] = security.ifFailed;
    for (const { schemeID, scheme } of security.securitySchemes.flat()) {
      securitySchemes[schemeID] = scheme;
    }
  }

  if (hasRequestHeaders || hasQueryParameters || hasURLParameters) {
    const conditionString = Object.entries({
      ["URL path parameters"]: hasURLParameters,
      query: hasQueryParameters,
      ["request headers"]: hasRequestHeaders,
    })
      .filter(([, val]) => val)
      .map(([name]) => name)
      .join(" or ");
    const response400: openapi.ResponseObject = {
      description: `If ${conditionString} fail validation.`,
    };
    operationObject.responses[400] =
      customize400Response?.(response400) ?? response400;
  }

  return operationObject;
};

const getResponseBody = <
  TProtocolEncodedHKT extends protocol.EncodedHKTBase,
  TValidatorHKT extends data.ValidatorHKTBase,
>(
  getUndefinedPossibility: jsonSchemaPlugin.GetUndefinedPossibility<
    data.AnyEncoderGeneric<TValidatorHKT>
  >,
  generateJSONSchema: GenerateAnyJSONSchema,
  outputSpec: dataBE.DataValidatorResponseOutputValidatorSpec<
    unknown,
    unknown,
    TValidatorHKT,
    string
  >,
  output: types.MetadataParameterResponseBody<
    TProtocolEncodedHKT,
    unknown,
    string
  >["responseBody"],
): Record<string, openapi.ResponseObject> => {
  const contentEntries = Object.entries(outputSpec.contents);
  let hasResponse204 = false;
  const response200Entries: ContentTypeDecodersOrEncoders = [];
  for (const [contentType, contentOutput] of contentEntries) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    const undefinedPossibility = getUndefinedPossibility(contentOutput);
    if (undefinedPossibility !== false) {
      hasResponse204 = true;
    }
    if (undefinedPossibility !== true) {
      response200Entries.push([contentType, contentOutput]);
    }
  }
  const responseObjects: Record<string, openapi.ResponseObject> = {};
  if (hasResponse204) {
    responseObjects["204"] = {
      description: output.description,
    };
  }
  if (response200Entries.length > 0) {
    responseObjects["200"] = {
      description: output.description,
      content: getContentMap(
        response200Entries,
        output.mediaTypes,
        generateJSONSchema,
      ),
    };
  }

  return responseObjects;
};

const handleResponseHeaders = <TValidatorHKT extends data.ValidatorHKTBase>(
  stringEncoder: StringEncoder<TValidatorHKT>,
  responseHeadersSpec:
    | dataBE.ResponseHeaderDataValidatorSpecMetadata<
        protocol.TResponseHeadersDataBase,
        TValidatorHKT
      >
    | undefined,
  responseHeadersObject:
    | types.MetadataParameterResponseHeaders<protocol.TResponseHeadersDataBase>["responseHeaders"]
    | undefined,
  responseObjects: ReturnType<typeof getResponseBody>,
) => {
  if (responseHeadersSpec && responseHeadersObject) {
    for (const responseObject of Object.values(responseObjects)) {
      responseObject.headers = data.transformEntries(
        responseHeadersSpec,
        ({ required, encoder }, headerName): openapi.HeaderObject => ({
          ...responseHeadersObject[headerName],
          required,
          schema: stringEncoder(encoder, true),
        }),
      );
    }
  }
};

const getRequestHeaders = <TValidatorHKT extends data.ValidatorHKTBase>(
  stringDecoder: StringDecoder<TValidatorHKT>,
  requestHeadersSpec:
    | dataBE.RequestHeaderDataValidatorSpecMetadata<
        protocol.TRequestHeadersDataBase,
        TValidatorHKT
      >
    | undefined,
  requestHeadersObject:
    | types.MetadataParameterRequestHeaders<protocol.TRequestHeadersDataBase>["headers"]
    | undefined,
) =>
  requestHeadersSpec && requestHeadersObject
    ? Object.entries(requestHeadersSpec).map<openapi.ParameterObject>(
        ([headerName, { required, decoder }]) => ({
          ...requestHeadersObject[headerName],
          in: "header",
          name: headerName,
          required,
          schema: stringDecoder(decoder, true),
        }),
      )
    : [];

const getQuery = <TValidatorHKT extends data.ValidatorHKTBase>(
  stringDecoder: StringDecoder<TValidatorHKT>,
  querySpec:
    | dataBE.QueryDataValidatorSpecMetadata<
        protocol.TQueryDataBase,
        TValidatorHKT
      >
    | undefined,
  queryObject:
    | types.MetadataParameterQuery<protocol.TQueryDataBase>["query"]
    | undefined,
) =>
  querySpec && queryObject
    ? Object.entries(querySpec).map<openapi.ParameterObject>(
        ([qParamName, { required, decoder }]) => ({
          ...queryObject[qParamName],
          in: "query",
          name: qParamName,
          required,
          schema: stringDecoder(decoder, true),
        }),
      )
    : [];

const getRequestBody = <
  TProtocolEncodedHKT extends protocol.EncodedHKTBase,
  TValidatorHKT extends data.ValidatorHKTBase,
>(
  getUndefinedPossibility: jsonSchemaPlugin.GetUndefinedPossibility<
    | data.AnyDecoderGeneric<TValidatorHKT>
    | data.AnyEncoderGeneric<TValidatorHKT>
  >,
  generateJSONSchema: GenerateAnyJSONSchema,
  inputSpec: dataBE.DataValidatorResponseInputValidatorSpec<
    unknown,
    TValidatorHKT,
    string
  >,
  body: types.MetadataParameterRequestBody<
    TProtocolEncodedHKT,
    unknown,
    string
  >["requestBody"],
): openapi.RequestBodyObject => {
  const inputEntries = Object.entries(inputSpec.contents);
  return {
    required: !inputEntries.some(
      ([, contentInput]) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        getUndefinedPossibility(contentInput as any) !== false,
    ),
    content: getContentMap(inputEntries, body, generateJSONSchema),
  };
};

const addSchema = <
  T extends { schema?: openapi.ReferenceObject | openapi.SchemaObject },
>(
  obj: T,
  schema: openapi.SchemaObject | undefined,
): T => {
  if (schema) {
    obj.schema = schema;
  }
  return obj;
};

const getContentMap = (
  contentEntries: ContentTypeDecodersOrEncoders,
  mediaTypes: Record<string, types.MetadataParameterMediaType<unknown>>,
  generateJSONSchema: GenerateAnyJSONSchema,
) =>
  Object.fromEntries(
    contentEntries.map(([contentType, contentOutput]) => [
      contentType,
      addSchema<openapi.MediaTypeObject>(
        {
          example: mediaTypes[contentType].example,
        },
        generateJSONSchema(contentType, contentOutput),
      ),
    ]),
  );

const getUrlPathString = (urlSpec: md.URLPathPatternInfo) =>
  urlSpec
    .map((stringOrSpec) =>
      typeof stringOrSpec === "string"
        ? stringOrSpec
        : `{${stringOrSpec.name}}`,
    )
    .join("");

type ContentTypeDecodersOrEncoders = Array<[string, unknown]>;

type GenerateAnyJSONSchema = (
  ...entry: ContentTypeDecodersOrEncoders[number]
) => openapi.SchemaObject | undefined;

type StringEncoder<TValidatorHKT extends data.ValidatorHKTBase> =
  jsonSchemaPlugin.Transformer<
    data.AnyEncoderGeneric<TValidatorHKT>,
    openapi.SchemaObject
  >;
type StringDecoder<TValidatorHKT extends data.ValidatorHKTBase> =
  jsonSchemaPlugin.Transformer<
    data.AnyDecoderGeneric<TValidatorHKT>,
    openapi.SchemaObject
  >;

/**
 * This type is callback type to extract {@link OperationSecurityInformation} from BE endpoint state information.
 */
export type GetOperationSecurityInformation<
  TStateHKT extends dataBE.StateHKTBase,
> = (
  stateInfo: ep.EndpointStateInformation<
    dataBE.MaterializeStateInfo<
      TStateHKT,
      dataBE.MaterializeStateSpecBase<TStateHKT>
    >,
    dataBE.MaterializeRuntimeState<
      TStateHKT,
      dataBE.MaterializeStateSpecBase<TStateHKT>
    >
  >,
) => undefined | OperationSecurityInformation;

/**
 * This type contains information about security schemes related to single BE endpoint.
 */
export interface OperationSecurityInformation {
  /**
   * The security schemes used by this endpoint.
   * The property is an array of one or more usages of single security scheme.
   * Each element of this array is another array of one or more elements, each element of this sub-array representing one usage of one security scheme.
   *
   * Typically, there is just one element in both outer and inner arrays, but more complex endpoints may have different amount of elements.
   */
  securitySchemes: Array<Array<OperationSecuritySchemeUsage>>;

  /**
   * The {@link openapi.ResponseObject} to use for response for HTTP code `401`.
   */
  ifFailed: openapi.ResponseObject;
}

/**
 * This type contains information about one BE endpoint usage of one security scheme.
 */
export interface OperationSecuritySchemeUsage {
  /**
   * The textual ID of the security scheme - will be used as key for {@link openapi.ComponentsObject.securitySchemes}.
   */
  schemeID: string;

  /**
   * The information about the security scheme identifier by {@link schemeID}.
   */
  scheme: openapi.SecuritySchemeObject;

  /**
   * The information about requirements for the security scheme by this specific BE endpoint.
   */
  requirementData: Array<string>;

  /**
   * Should be `true` if authentication is optional for this specific BE endpoint, `false` otherwise.
   */
  isOptional: boolean;
}

type FullEndpointSpecMDParameter<
  TProtocolEncodedHKT extends protocol.EncodedHKTBase,
> = md.MaterializeParameterWhenSpecifyingEndpoint<
  types.MetadataProviderHKT,
  TProtocolEncodedHKT,
  protocol.ProtocolSpecCore<protocol.HttpMethod, unknown> &
    protocol.ProtocolSpecHeaderData<protocol.TRequestHeadersDataBase> &
    protocol.ProtocolSpecResponseHeaders<protocol.TResponseHeadersDataBase> &
    protocol.ProtocolSpecQuery<protocol.TQueryDataBase>,
  string,
  string
>;
