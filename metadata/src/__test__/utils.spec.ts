/**
 * @file This file contains unit tests for functionality in file `../utils.ts`.
 */

import test from "ava";
import * as spec from "../utils";
import type { OpenAPIV3 as openapi } from "openapi-types";

test("Validate removeAuthenticatedOperations returns undefined if all endpoints are authenticated", (c) => {
  c.plan(1);
  c.deepEqual(
    spec.removeAuthenticatedOperations({
      ...common,
      paths: {
        path: {
          get: {
            responses: {},
            security: [{ auth: [] }],
          },
        },
      },
    }),
    undefined,
  );
});

test("Validate removeAuthenticatedOperations returns same object if all endpoints are without authentication and no security components", (c) => {
  c.plan(5);
  const doc: openapi.Document = {
    ...common,
    paths: {
      path: {},
    },
  };
  c.is(spec.removeAuthenticatedOperations(doc), doc);
  const docWithComponents: openapi.Document = {
    ...doc,
    components: {
      requestBodies: {},
    },
  };
  c.is(
    spec.removeAuthenticatedOperations(docWithComponents),
    docWithComponents,
  );
  const docWithComponentEmptySecuritySchemes: openapi.Document = {
    ...doc,
    components: {
      securitySchemes: {},
    },
  };
  c.deepEqual(
    spec.removeAuthenticatedOperations(docWithComponentEmptySecuritySchemes),
    doc,
  );
  const docWithOperations: openapi.Document = {
    ...common,
    paths: {
      path: {
        get: {
          responses: {},
          security: [],
        },
      },
    },
  };
  c.deepEqual(spec.removeAuthenticatedOperations(docWithOperations), {
    ...common,
    paths: {
      path: {
        get: {
          responses: {},
        },
      },
    },
  });
  const docWithOperationsAndUndefinedSecurity: openapi.Document = {
    ...common,
    paths: {
      path: {
        get: {
          responses: {},
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          security: undefined as any,
        },
      },
    },
  };
  c.deepEqual(
    spec.removeAuthenticatedOperations(docWithOperationsAndUndefinedSecurity),
    {
      ...common,
      paths: {
        path: {
          get: {
            responses: {},
          },
        },
      },
    },
  );
});

test("Validate removeAuthenticatedOperations removes only authenticated operations", (c) => {
  c.plan(2);
  const docWithAuthenticated: openapi.Document = {
    ...common,
    paths: {
      path: {
        get: {
          responses: {},
          security: [{ auth: [] }],
        },
        post: {
          responses: {},
          security: [],
        },
      },
    },
    components: {
      securitySchemes: {
        auth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
  };
  const docWithAuthenticatedExpected: openapi.Document = {
    ...common,
    paths: {
      path: {
        post: {
          responses: {},
        },
      },
    },
  };
  c.deepEqual(
    spec.removeAuthenticatedOperations(docWithAuthenticated),
    docWithAuthenticatedExpected,
  );
  const components: openapi.ComponentsObject = {
    requestBodies: {},
  };
  c.deepEqual(
    spec.removeAuthenticatedOperations({
      ...docWithAuthenticated,
      components: {
        ...components,
        securitySchemes: {},
      },
    }),
    {
      ...docWithAuthenticatedExpected,
      components,
    },
  );
});

test("Validate removeAuthenticatedOperations preserves operations with optional security", (c) => {
  c.plan(1);
  const docWithAuthenticated: openapi.Document = {
    ...common,
    paths: {
      path: {
        get: {
          responses: {},
          security: [{}, { auth: [] }],
        },
      },
    },
    components: {
      securitySchemes: {
        auth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
  };
  c.deepEqual(spec.removeAuthenticatedOperations(docWithAuthenticated), {
    ...common,
    paths: {
      path: {
        get: {
          responses: {},
        },
      },
    },
  });
});

const common: Pick<openapi.Document, "openapi" | "info"> = {
  openapi: "0.0.0",
  info: {
    title: "Title",
    version: "0.0.0",
  },
};
