"use client";

import { useEffect, useState } from "react";
import { getFilePreviewUrl } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type FilePreviewProps = {
  fileId: string | null;
  filename: string;
  onClose: () => void;
};

export function FilePreview({ fileId, filename, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileId) return;

    setLoading(true);
    setError(false);

    getFilePreviewUrl(fileId)
      .then((url) => {
        setPreviewUrl(url);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [fileId]);

  if (!fileId) return null;

  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(extension);
  const isPdf = extension === "pdf";
  const isVideo = ["mp4", "webm", "ogg", "mov"].includes(extension);
  const isAudio = ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension);
  const isText = ["txt", "md", "json", "xml", "csv", "log", "js", "ts", "tsx", "jsx", "css", "html"].includes(extension);

  return (
    <Dialog open={!!fileId} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[75vh] flex flex-col" showCloseButton={false}>
        <div className="flex justify-between items-center mb-4">
          <DialogTitle className="truncate">{filename}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 rounded-lg">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading preview...</span>
            </div>
          )}

          {error && (
            <div className="text-center text-muted-foreground">
              <p>Unable to preview this file</p>
              <p className="text-sm mt-2">Try downloading it instead</p>
            </div>
          )}

          {!loading && !error && previewUrl && (
            <>
              {isImage && (
                <img
                  src={previewUrl}
                  alt={filename}
                  className="max-w-full max-h-full object-contain"
                />
              )}

              {isPdf && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={filename}
                />
              )}

              {isVideo && (
                <video
                  src={previewUrl}
                  controls
                  className="max-w-full max-h-full"
                >
                  Your browser does not support video playback.
                </video>
              )}

              {isAudio && (
                <audio src={previewUrl} controls className="w-full max-w-2xl">
                  Your browser does not support audio playback.
                </audio>
              )}

              {isText && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 bg-white dark:bg-gray-900"
                  title={filename}
                />
              )}

              {!isImage && !isPdf && !isVideo && !isAudio && !isText && (
                <div className="text-center text-muted-foreground">
                  <p>Preview not available for this file type</p>
                  <p className="text-sm mt-2">(.{extension})</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
