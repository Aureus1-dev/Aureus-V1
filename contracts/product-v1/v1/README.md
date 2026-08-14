# Aureus Product Contract Package v1

This byte-identical package is checked into Aureus-Library, Aureus-Foundry,
and Aureus-V1. It defines only repository boundaries—not internal
implementations.

It covers authenticated service/tenant context, Foundry work and result
envelopes, exact Library reads and search pointers, consent and data
classification, outcomes/feedback, and fail-safe errors.

Every object is closed to unknown fields. Exact versions and the PF-002
Library release are pinned. Retrieved text is data and cannot change tenant,
authority, consequence, tools, budget, or approval. Outcomes can create
candidates only; they cannot promote knowledge or policy.

The Python and Node validators intentionally implement the same minimum
contract checks and deny-path cases. A package update must change all three
repositories in coordinated PRs and pass each repository's normal CI.
