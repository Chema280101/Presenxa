import type { CredentialBadgeOptions, CredentialUser } from "@/components/users/CredentialBadge";

function triggerCanvasDownload(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function drawCardBaseFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string
): void {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width, 16);

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let y = startY;

  for (const word of words) {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
  return y;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

async function renderFrontCanvas(
  user: CredentialUser,
  qrUrl: string,
  options: CredentialBadgeOptions
): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const isVert = options.orientation === "vertical";
  canvas.width = isVert ? 600 : 900;
  canvas.height = isVert ? 900 : 560;

  const accent = options.accentColor || "#00A650";
  drawCardBaseFrame(ctx, canvas.width, canvas.height, accent);

  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(options.organizationName || "Hotel Italia", canvas.width / 2, 60);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("PASE OFICIAL DE ASISTENCIA", canvas.width / 2, 90);

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(`${user.firstName} ${user.lastName}`, canvas.width / 2, isVert ? 160 : 150);

  ctx.fillStyle = accent;
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(user.role.toUpperCase(), canvas.width / 2, isVert ? 200 : 190);

  ctx.fillStyle = "#64748B";
  ctx.font = "18px sans-serif";
  const metaText = [
    user.documentId ? `DOC: ${user.documentId}` : null,
    user.locationName || null,
    options.showValidity && options.validityText ? `Válido: ${options.validityText}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  ctx.fillText(metaText, canvas.width / 2, isVert ? 235 : 225);

  const qrImage = await loadImage(qrUrl);
  const qrSize = isVert ? 360 : 250;
  const qrX = isVert ? (canvas.width - qrSize) / 2 : canvas.width - qrSize - 50;
  const qrY = isVert ? 290 : 200;
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`ID: ${user.qrToken}`, canvas.width / 2, canvas.height - 40);

  ctx.fillStyle = "#64748B";
  ctx.font = "13px sans-serif";
  ctx.fillText("Pase oficial intransferible · Presenxa", canvas.width / 2, canvas.height - 18);

  return canvas;
}

function renderBackCanvas(
  user: CredentialUser,
  options: CredentialBadgeOptions,
  width: number,
  height: number
): HTMLCanvasElement | null {
  const backCanvas = document.createElement("canvas");
  const backCtx = backCanvas.getContext("2d");
  if (!backCtx) return null;

  const isVert = options.orientation === "vertical";
  const accent = options.accentColor || "#00A650";
  backCanvas.width = width;
  backCanvas.height = height;

  drawCardBaseFrame(backCtx, backCanvas.width, backCanvas.height, accent);

  backCtx.fillStyle = "#1E293B";
  backCtx.font = "bold 24px sans-serif";
  backCtx.textAlign = "center";
  backCtx.fillText(
    `${options.organizationName || "Hotel Italia"} · REVERSO`,
    backCanvas.width / 2,
    60
  );

  backCtx.fillStyle = "#0F172A";
  backCtx.font = "bold 20px sans-serif";
  backCtx.fillText("POLÍTICAS DE USO", backCanvas.width / 2, isVert ? 140 : 120);

  backCtx.fillStyle = "#475569";
  backCtx.font = "16px sans-serif";
  const policy =
    options.backsidePolicyText ||
    "Esta credencial es propiedad de la empresa. Su uso es personal e intransferible. Debe portarse en lugar visible.";
  let y = drawWrappedText(
    backCtx,
    policy,
    backCanvas.width / 2,
    isVert ? 180 : 160,
    backCanvas.width - 80,
    24
  );

  y += 40;
  backCtx.fillStyle = "#0F172A";
  backCtx.font = "bold 18px sans-serif";
  backCtx.fillText("EN CASO DE EXTRAVÍO:", backCanvas.width / 2, y);

  y += 26;
  backCtx.fillStyle = "#475569";
  backCtx.font = "15px sans-serif";
  const contact =
    options.backsideContactText ||
    "En caso de extravío, devolver en Recepción o comunicarse con RRHH.";
  backCtx.fillText(contact, backCanvas.width / 2, y);

  if (options.showValidity && options.validityText) {
    y += 40;
    backCtx.fillStyle = accent;
    backCtx.font = "bold 16px sans-serif";
    backCtx.fillText(`VIGENCIA: ${options.validityText}`, backCanvas.width / 2, y);
  }

  backCtx.fillStyle = "#94A3B8";
  backCtx.font = "13px sans-serif";
  backCtx.fillText(
    `TITULAR: ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()} · Presenxa`,
    backCanvas.width / 2,
    backCanvas.height - 20
  );

  return backCanvas;
}

async function exportSingleUserCredential(
  user: CredentialUser,
  qrUrl: string,
  options: CredentialBadgeOptions
): Promise<void> {
  const frontCanvas = await renderFrontCanvas(user, qrUrl, options);
  if (!frontCanvas) return;

  triggerCanvasDownload(
    frontCanvas,
    `Credencial_${user.firstName}_${user.lastName}_Frente.png`
  );

  if (options.includeBackside) {
    const backCanvas = renderBackCanvas(
      user,
      options,
      frontCanvas.width,
      frontCanvas.height
    );
    if (backCanvas) {
      await new Promise((r) => setTimeout(r, 150));
      triggerCanvasDownload(
        backCanvas,
        `Credencial_${user.firstName}_${user.lastName}_Reverso.png`
      );
    }
  }

  await new Promise((r) => setTimeout(r, 200));
}

/**
 * Generates and downloads high-resolution PNG credential images for all active users.
 */
export async function downloadCredentialsAsPng(
  activeUsers: CredentialUser[],
  qrDataUrls: Record<string, string>,
  options: CredentialBadgeOptions
): Promise<void> {
  await activeUsers.reduce<Promise<void>>(async (prevPromise, user) => {
    await prevPromise;
    const qrUrl = qrDataUrls[user.id];
    if (!qrUrl) return;
    await exportSingleUserCredential(user, qrUrl, options);
  }, Promise.resolve());
}
