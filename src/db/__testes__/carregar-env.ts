// Roda antes de qualquer módulo do teste ser importado — imports ESM são
// içados, então carregar o .env dentro de um arquivo de teste seria tarde
// demais para o cliente de banco, que lê process.env no momento do import.
import "dotenv/config";
