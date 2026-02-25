# Bluecat

Node.js library for building RESTful API HTTP requests and maintaining sessions for API testing.

## Cursor Cloud specific instructions

### Node.js version requirement

This project requires **Node.js 12** due to the `fibers` v4.0.x native addon dependency. The prebuilt binary for `fibers` is available for Node 12 (`linux-x64-72-glibc`). Node 14+ fails to build fibers because the bundled `node-gyp` is incompatible with Python 3.12+. Node 16+ has a runtime crash in the fibers coroutine module. Use `nvm use 12` before running any commands.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` (from repo root) |
| Run tests | `npm test` |
| Run linter | `./node_modules/.bin/grunt` |
| CLI tool | `bluecat api` (lists defined API routes) |

### Architecture notes

- Single npm package (not a monorepo). Source in `lib/`, tests in `test/`, CLI in `bin/`.
- Unit tests are self-contained: they spin up a local HTTP server on port 6767 in-process. No external services needed.
- The `examples/` directory has a separate `package.json` that tests against `httpbin.org`. To use the local library, run `npm link` in root then `npm link bluecat` in `examples/`.
- The 2 failing example tests (`/ip`, `/user-agent`) are pre-existing bugs using `.to.be.defined` (invalid Chai assertion); not an environment issue.
