# Tenant Config Validation

This module takes JSON-formatted Auth0 tenant configuration and runs it through a number of checks based on the entity type (client, action, etc.). The tenant configuration data is loaded into memory for the checks so configuration from files and API endpoints should be gathered first, then passed to this validator.

This library uses [`auth0/auth0-checkmate`](https://github.com/auth0/auth0-checkmate/tree/main/analyzer/lib) for some of it's checks, then layers additional ones on top.

## Code audience

The code and validation checks here should be written to be clear to internal architects and consultants. Code comments should be concise and omitted where the code is self-explanatory. Validations that are based on online documentation from Auth0 or IETF specifications should include a URL in the comments.

## Validation codes and levels

Each validation should have a clear, human-readable code, like "clients_grants_include_implicit" that start with the entity name and only contain letters and underscores. These will eventually be used as configuration to allow for checks to be skipped.

Discoveries should be reported as one of 4 different levels:

- **Critical**: Issues that **must be** corrected before moving to production.
- **Important**: Issues that **should be** corrected but may have an allowable edge case
- **Recommended**: Issues that affect maintainability or complexity but are not security problems
- **Informational**: Things to note that may not be issues
