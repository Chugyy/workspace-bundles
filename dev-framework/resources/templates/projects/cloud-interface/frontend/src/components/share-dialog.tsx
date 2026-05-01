"use client";

import { useEffect, useState } from "react";
import { useCreateShareLink } from "@/hooks/use-storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

type ShareDialogProps = {
  fileId: string | null;
  onClose: () => void;
};

export function ShareDialog({ fileId, onClose }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createShareLink = useCreateShareLink();

  useEffect(() => {
    if (fileId) {
      createShareLink.mutate(fileId, {
        onSuccess: (data) => {
          setShareUrl(data.share_url);
        },
        onError: () => {
          toast.error("Failed to create share link");
          onClose();
        },
      });
    } else {
      setShareUrl(null);
      setCopied(false);
    }
  }, [fileId]);

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={!!fileId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share file</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {createShareLink.isPending && (
            <p className="text-sm text-muted-foreground">Generating link...</p>
          )}
          {shareUrl && (
            <>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="flex-1" />
                <Button onClick={copyToClipboard} variant="outline" size="icon">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can download the file
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
