// `server-only` exists so bundlers block server code from being imported by
// client components. There's no bundler and no client in tests, so it's
// replaced by this empty module (see vitest.config.mts).
export {};
