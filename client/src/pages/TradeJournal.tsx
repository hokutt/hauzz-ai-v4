import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  Square,
  Loader2,
  ImagePlus,
  X,
  Trash2,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

type AttachedImage = { url: string; preview: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatPnl(pnl: number | null) {
  if (pnl === null || pnl === undefined) return null;
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TradeJournal() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: false });

  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const transcribeMut = trpc.tradeJournal.transcribe.useMutation();
  const uploadImageMut = trpc.tradeJournal.uploadImage.useMutation();
  const logTradeMut = trpc.tradeJournal.logFromVoice.useMutation();
  const deleteMut = trpc.tradeJournal.delete.useMutation();
  const tradesQuery = trpc.tradeJournal.list.useQuery(undefined, {
    enabled: Boolean(user),
  });

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone not supported on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        await handleTranscribe(blob, mr.mimeType || "audio/webm");
      };
      mr.start();
      mediaRecorderRef.current = mr;
      recordStartRef.current = Date.now();
      setRecordingMs(0);
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        setRecordingMs(Date.now() - recordStartRef.current);
      }, 200);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't access the microphone. Check browser permissions.");
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    setRecording(false);
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  async function handleTranscribe(blob: Blob, mimeType: string) {
    setTranscribing(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const res = await transcribeMut.mutateAsync({ audioBase64, mimeType });
      setTranscript((prev) => (prev ? `${prev} ${res.text}` : res.text));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  }

  async function handlePickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (images.length + files.length > 6) {
      toast.error("Up to 6 images per trade.");
      return;
    }
    setUploadingImages(true);
    try {
      const uploaded: AttachedImage[] = [];
      for (const file of files) {
        const base64 = await fileToBase64(file);
        const preview = URL.createObjectURL(file);
        const res = await uploadImageMut.mutateAsync({
          imageBase64: base64,
          mimeType: file.type || "image/jpeg",
        });
        uploaded.push({ url: res.url, preview });
      }
      setImages((cur) => [...cur, ...uploaded]);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Image upload failed");
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(idx: number) {
    setImages((cur) => {
      const next = [...cur];
      const [removed] = next.splice(idx, 1);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }

  async function handleLog() {
    if (!transcript.trim()) {
      toast.error("Record or type what happened first.");
      return;
    }
    try {
      const res = await logTradeMut.mutateAsync({
        transcript: transcript.trim(),
        imageUrls: images.map((i) => i.url),
      });
      toast.success(res.agentSummary || "Trade logged.");
      setTranscript("");
      images.forEach((i) => URL.revokeObjectURL(i.preview));
      setImages([]);
      tradesQuery.refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Couldn't log trade");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMut.mutateAsync({ id });
      tradesQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    }
  }

  const recordingSeconds = useMemo(() => Math.floor(recordingMs / 1000), [recordingMs]);
  const trades = tradesQuery.data ?? [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 gap-4 px-6 text-center">
        <h1 className="text-3xl font-semibold">Trade Journal</h1>
        <p className="text-zinc-400 max-w-md">
          Sign in to dictate trades, attach charts, and have an agent log them for you.
        </p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Toaster theme="dark" position="top-center" richColors />

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Voice journal
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Talk through your trade.
          </h1>
          <p className="text-zinc-400 mt-2">
            Hit the mic, narrate the setup, drop in chart screenshots. The agent extracts symbol,
            entry, exit, P/L, and notes — and logs it.
          </p>
        </header>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-col items-center gap-3 py-2">
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={transcribing || logTradeMut.isPending}
                className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all ${
                  recording
                    ? "bg-red-500/20 ring-4 ring-red-500/40 animate-pulse"
                    : "bg-zinc-800 hover:bg-zinc-700 ring-1 ring-zinc-700"
                } ${transcribing ? "opacity-60 cursor-not-allowed" : ""}`}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                {transcribing ? (
                  <Loader2 className="h-9 w-9 animate-spin text-zinc-300" />
                ) : recording ? (
                  <Square className="h-9 w-9 text-red-400 fill-red-400" />
                ) : (
                  <Mic className="h-9 w-9 text-zinc-200" />
                )}
              </button>
              <div className="text-sm text-zinc-400 h-5">
                {recording
                  ? `Recording… ${recordingSeconds}s — tap to stop`
                  : transcribing
                  ? "Transcribing…"
                  : "Tap to record"}
              </div>
            </div>

            <Textarea
              placeholder="Or type / edit the transcript here. e.g. Long AAPL 100 shares at 182.40, stopped out at 181.10 after CPI spike, broke my plan, frustrated."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
            />

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <div
                    key={img.url}
                    className="relative aspect-square overflow-hidden rounded-md border border-zinc-800 bg-zinc-900"
                  >
                    <img
                      src={img.preview}
                      alt={`chart ${idx + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-zinc-100">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePickImages}
                  disabled={uploadingImages || images.length >= 6}
                />
                {uploadingImages ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                <span>{uploadingImages ? "Uploading…" : "Add chart screenshot"}</span>
              </label>

              <Button
                onClick={handleLog}
                disabled={
                  logTradeMut.isPending ||
                  transcribing ||
                  uploadingImages ||
                  !transcript.trim()
                }
                className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-medium"
              >
                {logTradeMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging…
                  </>
                ) : (
                  "Log trade"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Recent trades</h2>
            <span className="text-xs text-zinc-500">{trades.length} entries</span>
          </div>
          <Separator className="bg-zinc-800 mb-4" />

          {tradesQuery.isLoading ? (
            <div className="text-zinc-500 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : trades.length === 0 ? (
            <div className="text-zinc-500 text-sm">No trades yet. Record one above.</div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-2">
              <div className="space-y-3">
                {trades.map((t) => (
                  <Card key={t.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                              t.side === "long"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : t.side === "short"
                                ? "bg-rose-500/15 text-rose-400"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {t.side === "short" ? (
                              <TrendingDown className="h-5 w-5" />
                            ) : (
                              <TrendingUp className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-zinc-100">
                                {t.symbol ?? "Untagged"}
                              </span>
                              {t.side && (
                                <Badge
                                  variant="outline"
                                  className="border-zinc-700 text-zinc-400 uppercase text-[10px]"
                                >
                                  {t.side}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="border-zinc-700 text-zinc-400 uppercase text-[10px]"
                              >
                                {t.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">
                              {formatDate(t.entryAt ?? t.createdAt)}
                              {t.strategy ? ` · ${t.strategy}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {t.pnl !== null && t.pnl !== undefined && (
                            <span
                              className={`text-sm font-semibold ${
                                t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatPnl(t.pnl)}
                            </span>
                          )}
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-zinc-600 hover:text-rose-400"
                            aria-label="Delete trade"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {(t.entryPrice !== null || t.exitPrice !== null || t.quantity !== null) && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-zinc-950/60 rounded-md px-3 py-2">
                            <div className="text-zinc-500">Entry</div>
                            <div className="text-zinc-200">{t.entryPrice ?? "—"}</div>
                          </div>
                          <div className="bg-zinc-950/60 rounded-md px-3 py-2">
                            <div className="text-zinc-500">Exit</div>
                            <div className="text-zinc-200">{t.exitPrice ?? "—"}</div>
                          </div>
                          <div className="bg-zinc-950/60 rounded-md px-3 py-2">
                            <div className="text-zinc-500">Size</div>
                            <div className="text-zinc-200">{t.quantity ?? "—"}</div>
                          </div>
                        </div>
                      )}

                      {t.agentSummary && (
                        <p className="mt-3 text-sm text-zinc-300">{t.agentSummary}</p>
                      )}
                      {!t.agentSummary && t.notes && (
                        <p className="mt-3 text-sm text-zinc-300">{t.notes}</p>
                      )}

                      {Array.isArray(t.imageUrls) && t.imageUrls.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                          {t.imageUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0"
                            >
                              <img
                                src={url}
                                alt="chart"
                                className="h-20 w-28 object-cover rounded-md border border-zinc-800"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {Array.isArray(t.tags) && t.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {t.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </section>
      </div>
    </div>
  );
}
