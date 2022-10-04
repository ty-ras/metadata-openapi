import type * as jsonSchema from "json-schema";
import type * as jsonSchemaPlugin from "@ty-ras/metadata-jsonschema";
import type { OpenAPIV3 as openapi } from "openapi-types";

// OpenAPI doesn't support full shape of JSON7 schemas so we must convert unsupported ones first.
export const convertToOpenAPISchemaObject = (
  schema: jsonSchema.JSONSchema7Definition,
): openapi.SchemaObject =>
  convertBooleanSchemasToObjects(schema) as unknown as openapi.SchemaObject;

const convertBooleanSchemasToObjects = (
  schema: jsonSchemaPlugin.JSONSchema,
): Exclude<jsonSchemaPlugin.JSONSchema, boolean> =>
  typeof schema === "boolean"
    ? schema
      ? {}
      : { not: {} }
    : stripUndefineds({
        ...transformConstToEnum(schema),
        items: handleSchemaOrArray(schema.items),
        additionalItems: handleSchemaOrArray(schema.additionalItems),
        properties: handleSchemaRecord(schema.properties),
        patternProperties: handleSchemaRecord(schema.patternProperties),
        additionalProperties: handleSchemaOrArray(schema.additionalItems),
        dependencies: handleSchemaRecord(schema.dependencies),
        propertyNames: handleSchemaOrArray(schema.propertyNames),
        if: handleSchemaOrArray(schema.if),
        then: handleSchemaOrArray(schema.then),
        else: handleSchemaOrArray(schema.else),
        allOf: handleSchemaOrArray(schema.allOf),
        anyOf: handleSchemaOrArray(schema.anyOf),
        oneOf: handleSchemaOrArray(schema.oneOf),
        not: handleSchemaOrArray(schema.not),
        definitions: handleSchemaRecord(schema.definitions),
      });

// 'const', while present in actual JSON Schema, is not supported by OpenAPI JSON Schema spec.
const transformConstToEnum = (schema: jsonSchema.JSONSchema7) => {
  let copied = false;
  if ("const" in schema) {
    const { const: constValue, ...schemaObj } = schema;
    if (constValue !== undefined) {
      copied = true;
      schema = {
        enum: [constValue],
        ...schemaObj,
      };
    }
  }
  return copied ? schema : { ...schema };
};

const handleSchemaOrArray = <
  T extends jsonSchemaPlugin.JSONSchema | Array<jsonSchemaPlugin.JSONSchema>,
>(
  value: T | undefined,
): T | undefined =>
  value === undefined
    ? undefined
    : ((Array.isArray(value)
        ? value.map(convertBooleanSchemasToObjects)
        : convertBooleanSchemasToObjects(value)) as T);

const handleSchemaRecord = <
  TValue extends jsonSchemaPlugin.JSONSchema | undefined | string[],
>(
  record: Record<string, TValue> | undefined,
): Record<string, TValue> | undefined =>
  record === undefined
    ? record
    : Object.entries(record).reduce((newRecord, [key, val]) => {
        newRecord[key] =
          val !== undefined && !Array.isArray(val)
            ? (convertBooleanSchemasToObjects(val) as typeof newRecord[string])
            : val;
        return newRecord;
      }, {} as typeof record);

const stripUndefineds = <T extends Record<string, unknown>>(val: T): T => {
  for (const key of Object.keys(val)) {
    if (val[key] === undefined) {
      delete val[key];
    }
  }
  return val;
};
