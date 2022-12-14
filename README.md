# Typesafe REST API Specification - Metadata Library for OpenAPI Specification

[![CI Pipeline](https://github.com/ty-ras/metadata-openapi/actions/workflows/ci.yml/badge.svg)](https://github.com/ty-ras/metadata-openapi/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/ty-ras/metadata-openapi/actions/workflows/cd.yml/badge.svg)](https://github.com/ty-ras/metadata-openapi/actions/workflows/cd.yml)

The Typesafe REST API Specification is a family of libraries used to enable seamless development of Backend and/or Frontend which communicate via HTTP protocol.
The protocol specification is checked both at compile-time and run-time to verify that communication indeed adhers to the protocol.
This all is done in such way that it does not make development tedious or boring, but instead robust and fun!

This particular repository contains [OpenAPI Specification](https://swagger.io/specification/) related library, which is designed to be consumed by users of TyRAS:
- [metadata](./metadata) folder contains library that exposes `createOpenAPIProvider` function.
  The result of this function can be used in [@ty-ras/spec](https://github.com/ty-ras/server/) library to augment the builder of TyRAS `AppEndpoint`s to automatically generate OpenAPI `Document` based on the metadata of the endpoints.
  Full document including JSON schema specifications can be generated.