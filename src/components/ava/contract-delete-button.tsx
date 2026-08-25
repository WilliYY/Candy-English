"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteContractDocument } from "@/app/ava/actions";
import { Button } from "@/components/ui/button";

type ContractDeleteButtonProps = {
  contractId: string;
  contractTitle: string;
};

export function ContractDeleteButton({
  contractId,
  contractTitle,
}: ContractDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Excluir o contrato "${contractTitle}"? Esta acao remove o registro e o PDF e nao pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteContractDocument({ contractId });

      if (!result.ok) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={isPending}
      aria-label={`Excluir contrato ${contractTitle}`}
      title="Excluir contrato"
      onClick={handleDelete}
    >
      {isPending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : (
        <Trash2 aria-hidden="true" />
      )}
    </Button>
  );
}
