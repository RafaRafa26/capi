import "server-only"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"

import { BusinessError, Unauthenticated } from "@/shared/errors"
import type { McpContext } from "./context"
import { registerReadTools } from "./tools/read"

// The MCP edge (ARQUITETURA.md §8.2): same role as the server actions —
// validate input, call a service, translate errors — for Claude instead of
// a screen. No business rule lives here.

const INSTRUCTIONS = `Você está conectado ao Capi, sistema de gestão de recebimentos, repasses e conciliação bancária.
- Toda ferramenta pede empresa_id: comece com listar_empresas e confirme com a pessoa a empresa quando houver mais de uma.
- Valores saem em reais (número com duas casas). Datas no formato AAAA-MM-DD.
- "Custódia" é o dinheiro de favorecidos que a empresa recebeu e ainda deve repassar.
- Esta conexão é somente leitura.`

type Shape = Record<string, z.ZodType>

interface ToolConfig<S extends Shape> {
  title: string
  description: string
  inputSchema: S
  annotations?: ToolAnnotations
}

export interface ToolHelpers {
  /** Registers a tool whose handler returns plain data; errors become tool errors Claude can read. */
  tool<S extends Shape>(
    name: string,
    config: ToolConfig<S>,
    handler: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>,
  ): void
}

export type ToolRegistrar = (server: McpServer, context: McpContext, helpers: ToolHelpers) => void

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] }
}

export function createCapiMcpServer(context: McpContext): McpServer {
  const server = new McpServer({ name: "capi", version: "0.1.0" }, { instructions: INSTRUCTIONS })

  const helpers: ToolHelpers = {
    tool(name, config, handler) {
      server.registerTool(name, config, (async (args: z.infer<z.ZodObject<Shape>>) => {
        try {
          const data = await handler(args as never)
          return { content: [{ type: "text" as const, text: JSON.stringify(data) }] }
        } catch (error) {
          // Same rule as failure() in src/shared/errors.ts: only business
          // messages are shown; anything else could leak infrastructure detail.
          if (error instanceof BusinessError || error instanceof Unauthenticated) return errorResult(error.message)
          console.error(`[mcp] ${name} failed:`, error)
          return errorResult("Não foi possível concluir a consulta. Tente novamente.")
        }
      }) as never)
    },
  }

  registerReadTools(server, context, helpers)
  return server
}
