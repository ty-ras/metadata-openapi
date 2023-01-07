import type * as md from "@ty-ras/metadata";
import * as data from "@ty-ras/data";
import type * as dataBE from "@ty-ras/data-backend";
import type * as jsonSchemaPlugin from "@ty-ras/metadata-jsonschema";

import { OpenAPIV3 as openapi } from "openapi-types";
import * as types from "./openapi";

// This provider is meant to be passed over to AppEndpointBuilder within @ty-ras/spec package, instead of using the methods directly.
export const createOpenAPIProvider = <
  TStringDecoder,
  TStringEncoder,
  TOutputContents extends dataBE.TOutputContentsBase,
  TInputContents extends dataBE.TInputContentsBase,
>({
  stringDecoder,
  stringEncoder,
  encoders,
  decoders,
  getUndefinedPossibility,
}: // Notice that if we encapsulate this as separate type (e.g. OpenAPIJSONSchemaGenerationSupport), the usecase of passing it to AppEndpointBuilder will start requiring specifying generic arguments for this method!
jsonSchemaPlugin.SupportedJSONSchemaFunctionality<
  openapi.SchemaObject,
  TStringDecoder,
  TStringEncoder,
  {
    [P in keyof TOutputContents]: jsonSchemaPlugin.SchemaTransformation<
      TOutputContents[P]
    >;
  },
  {
    [P in keyof TInputContents]: jsonSchemaPlugin.SchemaTransformation<
      TInputContents[P]
    >;
  }
>): types.OpenAPIMetadataProvider<
  TStringDecoder,
  TStringEncoder,
  TOutputContents,
  TInputContents
> => {
  const generateEncoderJSONSchema = (contentType: string, encoder: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    encoders[contentType as keyof TOutputContents](encoder as any, true);
  const generateDecoderJSONSchema = (contentType: string, encoder: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    decoders[contentType as keyof TInputContents](encoder as any, true);
  const getAnyUndefinedPossibility = (decoderOrEncoder: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    getUndefinedPossibility(decoderOrEncoder as any);
  return {
    getEndpointsMetadata: (pathItemBase, urlSpec, methods) => {
      if (Object.keys(methods).length > 0) {
        const pathObject: openapi.PathItemObject = { ...pathItemBase };
        const urlParameters = getURLParameters(stringDecoder, urlSpec);
        if (urlParameters.length > 0) {
          // URL path parameters as common parameters for all operations under this URL path
          pathObject.parameters = urlParameters;
        }
        for (const [method, epInfo] of Object.entries(methods)) {
          if (epInfo) {
            pathObject[method.toLowerCase() as Lowercase<openapi.HttpMethods>] =
              getOperationObject(
                getAnyUndefinedPossibility,
                generateDecoderJSONSchema,
                generateEncoderJSONSchema,
                stringDecoder,
                stringEncoder,
                epInfo,
              );
          }
        }
        const urlString = getUrlPathString(urlSpec);
        return (urlPrefix) => ({
          urlPath: `${urlPrefix}${urlString}`,
          pathObject,
        });
      } else {
        return () => undefined;
      }
    },
    createFinalMetadata: (info, paths) => {
      const components: openapi.ComponentsObject = {};
      // TODO aggressively cache all cacheable things to components
      const securitySchemes: Record<string, openapi.SecuritySchemeObject> = {};
      paths.forEach(({ md, stateMD }) => {
        if (md) {
          Object.values(openapi.HttpMethods).forEach((method) => {
            const operation = md.pathObject[method];
            if (operation) {
              const operationMD =
                stateMD[method.toUpperCase() as keyof typeof stateMD];
              if (operationMD && operationMD.securitySchemes.length > 0) {
                operation.security = operationMD.securitySchemes.map(
                  ({ name }) => ({
                    [name]: [],
                  }),
                );
                operationMD.securitySchemes.forEach(
                  ({ name, scheme }) => (securitySchemes[name] = scheme),
                );
              }
            }
          });
        }
      });
      if (Object.keys(securitySchemes).length > 0) {
        components.securitySchemes = securitySchemes;
      }
      const doc: openapi.Document = {
        openapi: "3.0.3",
        info,
        paths: Object.fromEntries(
          paths
            .map(({ md }) => md)
            .filter((info): info is types.PathsObjectInfo => !!info)
            .map(({ urlPath, pathObject }) => [urlPath, pathObject]),
        ),
      };
      if (Object.keys(components).length > 0) {
        doc.components = components;
      }
      return doc;
    },
  };
};

const getOperationObject = <
  TStringDecoder,
  TStringEncoder,
  TOutputContents extends dataBE.TOutputContentsBase,
  TInputContents extends dataBE.TInputContentsBase,
>(
  getUndefinedPossibility: jsonSchemaPlugin.GetUndefinedPossibility<unknown>,
  generateDecoderJSONSchema: GenerateAnyJSONSchema,
  generateEncoderJSONSchema: GenerateAnyJSONSchema,
  stringDecoder: StringDecoderOrEncoder<TStringDecoder>,
  stringEncoder: StringDecoderOrEncoder<TStringEncoder>,
  endpointInfo: md.EndpointMetadataInformation<
    types.OpenAPIArguments,
    TStringDecoder,
    TStringEncoder,
    TOutputContents,
    TInputContents
  >,
): openapi.OperationObject => {
  const {
    metadataArguments,
    requestHeadersSpec,
    responseHeadersSpec,
    querySpec,
    inputSpec,
    outputSpec,
  } = endpointInfo;
  const parameters: Array<openapi.ParameterObject> = [];
  const responseObjects = getResponseBody(
    getUndefinedPossibility,
    generateEncoderJSONSchema,
    outputSpec,
    metadataArguments.output,
  );
  handleResponseHeaders(stringEncoder, responseHeadersSpec, responseObjects);
  const operationObject: openapi.OperationObject = {
    ...metadataArguments.operation,
    responses: responseObjects,
  };
  // Request headers
  parameters.push(...getRequestHeaders(stringDecoder, requestHeadersSpec));
  // Query parameters
  parameters.push(...getQuery(stringDecoder, querySpec));
  if (parameters.length > 0) {
    operationObject.parameters = parameters;
  }

  // Request body
  const requestBody = getRequestBody(
    getUndefinedPossibility,
    generateDecoderJSONSchema,
    inputSpec,
    metadataArguments.body,
  );
  if (requestBody) {
    operationObject.requestBody = requestBody;
  }

  return operationObject;
};

const getURLParameters = <TStringDecoder>(
  stringDecoder: StringDecoderOrEncoder<TStringDecoder>,
  urlSpec: md.URLParametersInfo<TStringDecoder>,
): Array<openapi.ParameterObject> =>
  urlSpec
    .filter(
      (s): s is md.URLParameterSpec<TStringDecoder> => typeof s !== "string",
    )
    .map(({ name, ...urlParamSpec }) => ({
      name: name,
      in: "path",
      required: true,
      schema: {
        ...stringDecoder(urlParamSpec.decoder, true),
        pattern: urlParamSpec.regExp.source,
      },
    }));

const getResponseBody = (
  getUndefinedPossibility: jsonSchemaPlugin.GetUndefinedPossibility<unknown>,
  generateJSONSchema: GenerateAnyJSONSchema,
  outputSpec: dataBE.DataValidatorResponseOutputValidatorSpec<dataBE.TOutputContentsBase>,
  output: types.OpenAPIArgumentsOutput<unknown>["output"],
): Record<string, openapi.ResponseObject> => {
  const contentEntries = Object.entries(outputSpec.contents);
  let hasResponse204 = false;
  const response200Entries: ContentTypeDecodersOrEncoders = [];
  for (const [contentType, contentOutput] of contentEntries) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    const undefinedPossibility = getUndefinedPossibility(contentOutput as any);
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

const handleResponseHeaders = <TStringEncoder>(
  stringEncoder: StringDecoderOrEncoder<TStringEncoder>,
  responseHeadersSpec:
    | dataBE.ResponseHeaderDataValidatorSpecMetadata<string, TStringEncoder>
    | undefined,
  responseObjects: ReturnType<typeof getResponseBody>,
) => {
  if (responseHeadersSpec) {
    for (const responseObject of Object.values(responseObjects)) {
      responseObject.headers = data.transformEntries(
        responseHeadersSpec,
        ({ required, encoder }): openapi.HeaderObject => ({
          required,
          schema: stringEncoder(encoder, true),
        }),
      );
    }
  }
};

const getRequestHeaders = <TStringDecoder>(
  stringDecoder: StringDecoderOrEncoder<TStringDecoder>,
  requestHeadersSpec:
    | dataBE.RequestHeaderDataValidatorSpecMetadata<string, TStringDecoder>
    | undefined,
) =>
  Object.entries(requestHeadersSpec ?? {}).map<openapi.ParameterObject>(
    ([headerName, { required, decoder }]) => ({
      in: "header",
      name: headerName,
      required,
      schema: stringDecoder(decoder, true),
    }),
  );

const getQuery = <TStringDecoder>(
  stringDecoder: StringDecoderOrEncoder<TStringDecoder>,
  querySpec:
    | dataBE.QueryDataValidatorSpecMetadata<string, TStringDecoder>
    | undefined,
) =>
  Object.entries(querySpec ?? {}).map<openapi.ParameterObject>(
    ([qParamName, { required, decoder }]) => ({
      in: "query",
      name: qParamName,
      required,
      schema: stringDecoder(decoder, true),
    }),
  );

const getRequestBody = (
  getUndefinedPossibility: jsonSchemaPlugin.GetUndefinedPossibility<unknown>,
  generateJSONSchema: GenerateAnyJSONSchema,
  inputSpec:
    | dataBE.DataValidatorResponseInputValidatorSpec<dataBE.TInputContentsBase>
    | undefined,
  body: types.OpenAPIArgumentsInput<unknown>["body"],
) => {
  let requestBody: openapi.RequestBodyObject | undefined;
  if (inputSpec) {
    const inputEntries = Object.entries(inputSpec.contents);
    requestBody = {
      required: !inputEntries.some(
        ([, contentInput]) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
          getUndefinedPossibility(contentInput as any) !== false,
      ),
      content: getContentMap(inputEntries, body, generateJSONSchema),
    };
  }
  return requestBody;
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
  mediaTypes: Record<string, types.OpenAPIParameterMedia<unknown>>,
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

const getUrlPathString = <TStringDecoder>(
  urlSpec: md.URLParametersInfo<TStringDecoder>,
) =>
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

type StringDecoderOrEncoder<TStringTransformer> = jsonSchemaPlugin.Transformer<
  TStringTransformer,
  openapi.SchemaObject
>;
