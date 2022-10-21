import { OpenAPIV3 as openapi } from "openapi-types";

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
