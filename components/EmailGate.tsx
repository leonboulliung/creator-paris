"use client";

import { useRef, useState } from "react";
import { setUser } from "@/lib/storage";

async function downscaleToDataUrl(file: File, max = 256, quality = 0.85): Promise<string> {
  const bmp = await createImageBitmap(file).catch(async () => {
    // fallback via Image
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
    URL.revokeObjectURL(url);
    return img as unknown as ImageBitmap;
  });
  const w = (bmp as ImageBitmap).width;
  const h = (bmp as ImageBitmap).height;
  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d")!;
  // square crop centered
  const side = Math.min(cw, ch);
  const sx = (cw - side) / 2;
  const sy = (ch - side) / 2;
  // draw to temp
  const tmp = document.createElement("canvas");
  tmp.width = cw;
  tmp.height = ch;
  tmp.getContext("2d")!.drawImage(bmp as CanvasImageSource, 0, 0, cw, ch);
  const sq = document.createElement("canvas");
  sq.width = max;
  sq.height = max;
  sq.getContext("2d")!.drawImage(tmp, sx, sy, side, side, 0, 0, max, max);
  return sq.toDataURL("image/jpeg", quality);
}

export function EmailGate({
  onDone,
  onCancel,
  reason,
}: {
  onDone: () => void;
  onCancel?: () => void;
  reason?: string;
}) {
  const [step, setStep] = useState<"email" | "avatar">("email");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string>("");
  const [error, setError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError("Enter a valid email.");
      return;
    }
    setError("");
    setEmail(v);
    setStep("avatar");
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      setError("Pick an image file.");
      return;
    }
    try {
      const url = await downscaleToDataUrl(f, 256, 0.85);
      setAvatar(url);
      setError("");
    } catch {
      setError("Couldn't process image.");
    }
  }

  function finish() {
    if (!avatar) {
      setError("Avatar required.");
      return;
    }
    setUser({ email, avatar, createdAt: Date.now() });
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col">
      <div className="px-6 pt-10 pb-6 border-b border-ink">
        <div className="flex items-center justify-between gap-3">
          <div className="mono text-[10px] tracking-widest opacity-60">
            CREATOR.PARIS · STEP {step === "email" ? "1" : "2"} / 2
            {reason ? ` · ${reason.toUpperCase()}` : ""}
          </div>
          {onCancel && (
            <button onClick={onCancel} className="mono text-[11px] tracking-widest hover:underline">
              CLOSE ✕
            </button>
          )}
        </div>
        <h1 className="editorial font-black text-[44px] sm:text-[64px] mt-3">
          {step === "email" ? "What's your email?" : "Add your face."}
        </h1>
        <p className="mono text-[12px] mt-3 max-w-lg opacity-70">
          {step === "email"
            ? "Used as your identity on the city layer. Local only — never sent anywhere."
            : "A small portrait so others see who's behind the card."}
        </p>
      </div>

      <div className="flex-1 px-6 py-8 max-w-xl w-full mx-auto">
        {step === "email" && (
          <form onSubmit={submitEmail} className="space-y-3">
            <label className="mono text-[10px] tracking-widest opacity-70">EMAIL</label>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@paris.lol"
              className="input"
            />
            {error && <p className="mono text-[11px] text-red-700">{error}</p>}
            <button type="submit" className="btn w-full">Continue →</button>
          </form>
        )}

        {step === "avatar" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-28 h-28 border border-ink overflow-hidden bg-white"
                aria-label="Upload picture"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="mono text-[10px] opacity-60">UPLOAD</span>
                )}
              </button>
              <div className="mono text-[11px] opacity-70 leading-relaxed">
                {email}
                <br />
                256px · jpeg · stored in localStorage
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPickAvatar}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn ghost w-full"
            >
              {avatar ? "Replace picture" : "Pick a picture"}
            </button>
            {error && <p className="mono text-[11px] text-red-700">{error}</p>}
            <button type="button" onClick={finish} className="btn w-full" disabled={!avatar}>
              Enter Paris →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
