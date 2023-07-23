/**
 * @file This file contains various utility methods related to OpenAPI types.
 */

import { OpenAPIV3 as openapi } from "openapi-types";

/**
 * Helper function to remove all authenticated {@link openapi.OperationObject}s from given {@link openapi.Document}.
 * A single {@link openapi.OperationObject} is deemed to have authenticated when its `security` property has at least one element.
 * @param metadata The {@link openapi.Document} to search for authenticated operations.
 * @returns A new {@link openapi.Document} containing only operations which are not deemed to be authenticated. If no such operations are left, returns `undefined`.
 */
export const removeAuthenticatedOperations = (
  metadata: openapi.Document,
): openapi.Document | undefined => {
  const originalPathsLength = Object.keys(metadata.paths).length;
  const unauthenticatedPaths = Array.from(
    removeOperationsMatchingFilter(
      metadata,
      ({ security }) =>
        // If the openapi.SecurityRequirementObject has 0 keys, it means that the security is optional
        // https://stackoverflow.com/questions/47659324/how-to-specify-an-endpoints-authorization-is-optional-in-openapi-v3
        // Technically, we need to worry only about 1st element in operation.security then, but let's just assume that any zero-keyed requirement signals optionality.
        !!security &&
        security.length > 0 &&
        security.every((sec) => Object.keys(sec).length > 0),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ security: _, ...operation }) => operation,
    ),
  );
  return originalPathsLength > unauthenticatedPaths.length ||
    unauthenticatedPaths.some(([, { modified }]) => modified)
    ? unauthenticatedPaths.length > 0
      ? removeSecuritySchemes({
          ...metadata,
          paths: Object.fromEntries(
            unauthenticatedPaths.map(
              ([key, { pathObject }]) => [key, pathObject] as const,
            ),
          ),
        })
      : undefined
    : removeSecuritySchemes(metadata);
};

// We have to disable require-yields because in util.d.ts file, there is no function body, and thus no yields statements.
// This results into error:
//  14:1  error  Missing JSDoc @returns declaration                                                jsdoc/require-returns
//  14:1  error  JSDoc @yields declaration present but yield expression not available in function  jsdoc/require-yields-check
// eslint-disable-next-line jsdoc/require-yields
/**
 * Function to iterate {@link openapi.PathsObject}s within given {@link openapi.Document} which end up with at least one suitable {@link openapi.OperationObject} after applying given callback to all of the operation objects of that path object.
 * @param metadata The {@link openapi.Document} to filter operations from.
 * @param filter The callback invoked for every encountered {@link openapi.OperationObject}. If returns `true`, then operation will be filtered out from {@link openapi.PathsObject} containing it.
 * @param transform The callback to transform {@link openapi.OperationObject}s which don't match the given `filter`. Notice that this will receive an original operation object, and should not modify it directly!
 * @returns Yields the tuples: the key of {@link openapi.PathsObject}, then object containing the path object if it contains at least one suitable {@link openapi.OperationObject}, and information whether any operations were removed.
 */
export function* removeOperationsMatchingFilter(
  metadata: openapi.Document,
  filter: (op: openapi.OperationObject) => boolean,
  transform: (op: openapi.OperationObject) => openapi.OperationObject,
) {
  for (const [pathKey, pathObject] of Object.entries(metadata.paths)) {
    let pathObjectOrExclude: typeof pathObject | string = pathObject;
    if (pathObject) {
      const methodsInPath = Object.values(openapi.HttpMethods)
        .map((method) => ({ method, operation: pathObject[method] }))
        .filter(
          (
            info,
          ): info is {
            method: openapi.HttpMethods;
            operation: openapi.OperationObject;
          } => !!info.operation,
        );
      const methodsToPreserve = new Map<
        openapi.HttpMethods,
        openapi.OperationObject
      >(
        methodsInPath
          .filter(({ operation }) => !filter(operation))
          .map(({ method, operation }) => [method, transform(operation)]),
      );
      pathObjectOrExclude =
        methodsToPreserve.size > 0
          ? preserveOperations(pathObject, methodsInPath, methodsToPreserve)
          : methodsInPath.length > 0
          ? "exclude"
          : // Path object without any methods I guess is not according to spec, but let's just not touch it then.
            pathObject;
    }
    if (typeof pathObjectOrExclude !== "string") {
      yield [
        pathKey,
        {
          pathObject: pathObjectOrExclude,
          modified: pathObjectOrExclude !== pathObject,
        },
      ] as const;
    }
  }
}

const preserveOperations = (
  pathObject: openapi.PathItemObject,
  methodsInPath: ReadonlyArray<{
    method: openapi.HttpMethods;
    operation: openapi.OperationObject;
  }>,
  methodsToPreserve: Map<openapi.HttpMethods, openapi.OperationObject>,
): openapi.PathItemObject => {
  const shallowClone = { ...pathObject };
  for (const { method } of methodsInPath) {
    const operationToPreserve = methodsToPreserve.get(method);
    if (operationToPreserve) {
      shallowClone[method] = operationToPreserve;
    } else {
      delete shallowClone[method];
    }
  }
  return shallowClone;
};

const removeSecuritySchemes = (doc: openapi.Document): openapi.Document => {
  // eslint-disable-next-line prefer-const
  let { components, ...remaining } = doc;
  if (components && "securitySchemes" in components) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { securitySchemes, ...otherComponents } = components;
    if (Object.keys(otherComponents).length > 0) {
      components = otherComponents;
    } else {
      components = {};
    }
    if (Object.keys(components).length === 0) {
      doc = remaining;
    } else {
      doc = { ...remaining, components };
    }
  }
  return doc;
};
