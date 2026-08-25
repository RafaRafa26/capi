// `server-only` existe para o bundler barrar import de código de servidor em
// componente de cliente. Nos testes não há bundler nem cliente, então ele é
// substituído por este módulo vazio (ver vitest.config.mts).
export {};
