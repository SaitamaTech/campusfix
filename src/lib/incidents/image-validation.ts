const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasExpectedSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return (
    mimeType === "image/webp" &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

export async function validateIncidentImages(files: File[]): Promise<string | null> {
  if (files.length > MAX_IMAGE_COUNT) {
    return `Upload no more than ${MAX_IMAGE_COUNT} photos.`;
  }

  for (const file of files) {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      return "Photos must be JPEG, PNG, or WebP.";
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      return "Each photo must be between 1 byte and 5 MB.";
    }

    const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!hasExpectedSignature(file.type, signature)) {
      return "A selected file does not match its declared image type.";
    }
  }

  return null;
}
