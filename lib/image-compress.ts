"use client";

/**
 * Verkleint een foto in de browser, vóór het uploaden.
 *
 * Foto's van een telefoon zijn al gauw 3 tot 8 MB. Die weigeren is vervelend,
 * en ze ongewijzigd doorsturen kan niet: Vercel kapt verzoeken boven ongeveer
 * 4,5 MB af, dus zo'n upload zou hoe dan ook stuklopen. Bovendien is een
 * productfoto van 4 MB zonde van de opslag én traag voor wie je lijst bekijkt.
 *
 * Dus schalen we hem terug tot maximaal 1600 pixels aan de lange zijde en
 * zoeken we de hoogste kwaliteit die onder de doelgrootte blijft.
 */

const MAX_BYTES = 500 * 1024;
const MAX_SIDE = 1600;
const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45];

/** Tekent de foto op een verkleind canvas. */
function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const context = canvas.getContext("2d");
  if (!context) return null;

  // Wit eronder: anders wordt doorzichtigheid zwart bij het opslaan als JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality),
  );
}

/** Leest het bestand in, ook op browsers zonder createImageBitmap. */
async function decode(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Sommige formaten lukken alleen via een <img>; die weg volgt hieronder.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("kan de foto niet lezen"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type CompressOptions = {
  maxBytes?: number;
  maxSide?: number;
};

/**
 * Geeft een kleinere versie van de foto terug. Lukt het verkleinen niet, of is
 * de foto al klein genoeg, dan komt het originele bestand terug — dan is een
 * mislukte poging nog altijd beter dan helemaal geen foto.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const maxBytes = options.maxBytes ?? MAX_BYTES;
  const maxSide = options.maxSide ?? MAX_SIDE;

  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxBytes) return file;

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    return file;
  }

  const width = "width" in source ? source.width : 0;
  const height = "height" in source ? source.height : 0;
  if (!width || !height) return file;

  try {
    // Eerst terugschalen, daarna de kwaliteit stap voor stap omlaag tot het
    // onder de doelgrootte zit.
    for (const scale of [1, 0.75, 0.5]) {
      const factor = Math.min(1, maxSide / Math.max(width, height)) * scale;
      const canvas = drawScaled(source, width * factor, height * factor);
      if (!canvas) return file;

      for (const quality of QUALITIES) {
        const blob = await toBlob(canvas, quality);
        if (!blob) continue;
        if (blob.size <= maxBytes) {
          return new File([blob], renameToJpeg(file.name), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
        }
      }
    }

    // Zelfs op de laagste stand nog te groot: geef dan het kleinste terug wat
    // we hebben kunnen maken.
    const canvas = drawScaled(source, width * 0.4, height * 0.4);
    const blob = canvas ? await toBlob(canvas, 0.4) : null;
    if (blob && blob.size < file.size) {
      return new File([blob], renameToJpeg(file.name), { type: "image/jpeg" });
    }
    return file;
  } finally {
    if ("close" in source) source.close();
  }
}

function renameToJpeg(name: string) {
  return `${name.replace(/\.[^.]+$/, "") || "foto"}.jpg`;
}
