import { toBlob } from "html-to-image";

export const SHARE_CAPTION =
  "Join Coach Kapi at practice tomorrow morning - coffeecoach.app";

const PIXEL_RATIO = 2;

/** Capture a DOM element as a PNG blob at 2× resolution. */
export async function captureAsBlob(element: HTMLElement): Promise<Blob> {
  const blob = await toBlob(element, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#1a0f00",
  });
  if (!blob) throw new Error("Capture failed");
  return blob;
}

/** Share a blob via Web Share API (with image file), or download as fallback. */
export async function shareOrDownload(
  blob: Blob,
  filename = "coffee-coach.png",
  caption = SHARE_CAPTION,
) {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({ files: [file], text: caption });
  } else {
    // Desktop / unsupported: trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas failed"))),
      "image/png",
    ),
  );
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Captures the stats DOM element and composites it between a Coffee Coach
 * branding header and footer using Canvas API, then shares.
 */
export async function captureStatsAndShare(statsEl: HTMLElement) {
  const HEADER_H = 64; // CSS px
  const FOOTER_H = 44; // CSS px

  const statsBlob = await toBlob(statsEl, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#1a0f00",
  });
  if (!statsBlob) throw new Error("Stats capture failed");

  const statsImg = await createImageBitmap(statsBlob);
  const W = statsImg.width;
  const scale = PIXEL_RATIO;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = statsImg.height + HEADER_H * scale + FOOTER_H * scale;

  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#1a0f00";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header text
  ctx.fillStyle = "#f49d25";
  ctx.font = `bold ${20 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText("Coffee Coach", 20 * scale, 38 * scale);

  ctx.fillStyle = "#94a3b8";
  ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText("My Brewing Stats", 20 * scale, 56 * scale);

  // Kapi avatar
  try {
    const kapi = await loadImg("/coach/img3_hero_thumbs_up.png");
    const avatarSize = 44 * scale;
    ctx.drawImage(
      kapi,
      W - avatarSize - 16 * scale,
      10 * scale,
      avatarSize,
      avatarSize,
    );
  } catch {
    // skip avatar if not loadable
  }

  // Divider
  ctx.fillStyle = "rgba(244,157,37,0.2)";
  ctx.fillRect(20 * scale, (HEADER_H - 2) * scale, (W / scale - 40) * scale, 1);

  // Stats content
  ctx.drawImage(statsImg, 0, HEADER_H * scale);

  // Footer
  ctx.fillStyle = "rgba(47,33,15,0.9)";
  ctx.fillRect(0, canvas.height - FOOTER_H * scale, W, FOOTER_H * scale);

  ctx.fillStyle = "rgba(244,157,37,0.5)";
  ctx.fillRect(0, canvas.height - FOOTER_H * scale, W, 1);

  ctx.fillStyle = "#94a3b8";
  ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("coffeecoach.app", W / 2, canvas.height - 14 * scale);

  const finalBlob = await canvasToBlob(canvas);
  await shareOrDownload(finalBlob, "coffee-coach-stats.png");
}
