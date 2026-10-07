#  API Contract Coverage

| Coverage dimension | Result |
|---|---:|
| Locked method/path signatures | 268 / 268 |
| Route purpose/permission/notes captured | 268 / 268 |
| Global success/list/error envelopes | LOCKED + IMPLEMENTED |
| Canonical status models | 12 / 12 |
| Permission literals | 170 preserved |
| Domain events | 21 / 21 |
| Explicit shared Zod schemas printed by source | 1 encoded |
| Section 10 source-example baselines | 12 encoded |
| Routes whose full field-level schema is not printed in source | 255 explicitly marked |

## Meaning of 100% route coverage

100% route coverage means every method/path/purpose/permission/notes entry from the source endpoint catalog is represented and guarded.

It does **not** mean the source document printed 100% of field-level schemas. Claiming that would be false. The maturity matrix prevents source examples and inferred implementation fields from being mislabeled as source-locked schemas.
