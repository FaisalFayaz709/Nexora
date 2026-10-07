#  Source Reconciliation Notes

These points are made explicit so implementation does not silently "fix" the specification.

## 1. `/api/v1` versus Section 10 example paths

The global API convention and endpoint catalog lock the base path as `/api/v1`. Section 10 examples show base-relative paths such as `/auth/login` and `/projects`.

Implementation uses the catalogued full path, e.g. `/api/v1/auth/login`.

## 2. Global success envelope versus abbreviated Section 10 responses

The global convention requires successful single-resource responses to include:

```json
{
  "data": {},
  "meta": { "requestId": "..." }
}
```

Section 10 examples show only the `data` member. contract baseline preserves the example's `data` shape while the production response schema applies the globally locked `meta.requestId`.

## 3. Field-level completeness

The document states that exact payload fields live under `shared/src/contracts`, but only one concrete shared Zod schema (`CreateCustomerSchema`) and selected request/response examples are printed.

Accordingly:

- the customer create request is marked `EXPLICIT_SHARED_ZOD_SCHEMA`;
- selected §10 examples are marked `SOURCE_EXAMPLE_BASELINE`;
- all other endpoints remain `ROUTE_SIGNATURE_ONLY` until their implementation contracts are defined from the approved source.

No missing payload field is silently invented and labeled as source-locked.

## 4. Endpoint permission catalog versus summarized permission catalog

The endpoint catalog contains granular permission literals beyond those separately summarized in §11.1. baseline freeze preserved both; contract baseline exports that preserved union rather than renaming or collapsing permissions.
