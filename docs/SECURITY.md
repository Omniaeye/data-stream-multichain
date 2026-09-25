# Security

## Scope

This repository contains the JEV presentation and routing layer. It must not contain access tokens, connector credentials, private upstream addresses, raw source archives, local database files, or personal data that is not required for the interface.

## Trust boundaries

| Boundary | Responsibility |
| --- | --- |
| Connector | source access, authentication, rate policy, normalization |
| JEV service | bounded passthrough of normalized envelopes |
| Browser | visualization and interaction only |

## Reporting

Report a security concern privately to the OMNIA EYE maintainers. Do not include credentials, private endpoint URLs, or unredacted raw captures in public issues.

## Maintainer practices

- Keep secrets in the deployment environment, never in Git.
- Restrict connector output to the fields needed by the presentation contract.
- Treat social content and source text as untrusted display data.
- Keep the health endpoint free of source, account, token, and environment details.
