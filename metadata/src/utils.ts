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
      (operation) => (operation.security?.length ?? 0) > 0,
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

// eslint-disable-next-line jsdoc/require-yields
/**
 * Function to iterate {@link openapi.PathsObject}s within given {@link openapi.Document} which end up with at least one suitable {@link openapi.OperationObject} after applying given callback to all of the operation objects of that path object.
 * @param metadata The {@link openapi.Document} to filter operations from.
 * @param filter The callback invoked for every encountered {@link openapi.OperationObject}. If returns `true`, then operation will be filtered out from {@link openapi.PathsObject} containing it.
 * @returns Yields the tuples: the key of {@link openapi.PathsObject}, then object containing the path object if it contains at least one suitable {@link openapi.OperationObject}, and information whether any operations were removed.
 */
export function* removeOperationsMatchingFilter(
  metadata: openapi.Document,
  filter: (op: openapi.OperationObject) => boolean,
) {
  for (const [pathKey, pathObject] of Object.entries(metadata.paths)) {
    let pathObjectOrExclude: typeof pathObject | string = pathObject;
    if (pathObject) {
      const supportedMethods = Object.values(openapi.HttpMethods).filter(
        (method) => method in pathObject,
      );
      const operationsToBeRemoved = supportedMethods.filter((method) => {
        const operation = pathObject[method];
        return operation && filter(operation);
      });
      pathObjectOrExclude =
        operationsToBeRemoved.length > 0
          ? supportedMethods.length > operationsToBeRemoved.length
            ? removeOperations(pathObject, operationsToBeRemoved)
            : "exclude"
          : pathObject;
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

const removeOperations = (
  pathObject: openapi.PathItemObject,
  methods: ReadonlyArray<openapi.HttpMethods>,
): openapi.PathItemObject => {
  const shallowClone = { ...pathObject };
  for (const method of methods) {
    delete shallowClone[method];
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
