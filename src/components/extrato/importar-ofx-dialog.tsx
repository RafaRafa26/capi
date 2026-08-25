"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { importarOfxAction } from "@/app/(app)/conciliacao/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImportarOfxDialog({
  contaId,
  contaNome,
}: {
  contaId: string;
  contaNome: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, iniciar] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function importar() {
    if (!arquivo) {
      toast.error("Selecione um arquivo OFX.");
      return;
    }

    const form = new FormData();
    form.set("contaId", contaId);
    form.set("arquivo", arquivo);

    iniciar(async () => {
      const r = await importarOfxAction(form);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }

      const { lidas, importadas, duplicadas } = r.dados;
      // Dizer quantas foram descartadas por duplicidade é o que dá confiança
      // para reimportar um arquivo sem medo (RN-16).
      toast.success(
        duplicadas > 0
          ? `${importadas} de ${lidas} transações importadas — ${duplicadas} já existiam.`
          : `${importadas} ${importadas === 1 ? "transação importada" : "transações importadas"}.`,
      );

      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" />
          Importar OFX
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar extrato</DialogTitle>
          <DialogDescription>
            Arquivo OFX da conta {contaNome}. Transações já importadas antes são
            reconhecidas e ignoradas, então reimportar o mesmo arquivo é seguro.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-4">
          <Label htmlFor="arquivo-ofx">Arquivo</Label>
          <Input
            id="arquivo-ofx"
            ref={inputRef}
            type="file"
            accept=".ofx,.OFX,text/plain,application/x-ofx"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
          {arquivo ? (
            <p className="text-muted-foreground text-xs">
              {arquivo.name} — {(arquivo.size / 1024).toFixed(0)} KB
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={importar} disabled={importando || !arquivo}>
            {importando ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
