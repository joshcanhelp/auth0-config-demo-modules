These are the following use cases that this package needs to support:

- Application deployed to a host
  - Only needs the `app` package
  - Needs to be able to pull down the latest from that package when a new deployment happens
- Application running locally for demos
  - Might need the tenant config and init commands but not always
  - Might need to run local modules to troubleshoot
- Developing this module directly