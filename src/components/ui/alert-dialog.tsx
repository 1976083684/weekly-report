"use client";

import { CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "success" | "error";
  message: string;
  onConfirm?: () => void;
}

export function AlertDialog({
  open,
  onOpenChange,
  type,
  message,
  onConfirm,
}: AlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <div className="flex flex-col items-center text-center gap-3 py-4">
          {type === "success" ? (
            <CheckCircle className="w-12 h-12 text-success" />
          ) : (
            <XCircle className="w-12 h-12 text-danger" />
          )}
          <DialogTitle>{type === "success" ? "操作成功" : "操作失败"}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
          <Button
            onClick={() => {
              onOpenChange(false);
              onConfirm?.();
            }}
            className="mt-2"
          >
            确认
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
