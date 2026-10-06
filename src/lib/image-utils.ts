const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 256;
const MAX_BYTES = 512000;

export async function processProfilePhoto(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed');
  }

  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = MAX_SIZE;
  canvas.height = MAX_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Center-crop to square
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);

  // Export as WebP, fallback to JPEG if browser doesn't support WebP encoding
  let dataUrl = canvas.toDataURL('image/webp', 0.8);
  if (dataUrl.startsWith('data:image/png')) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  }

  const base64Part = dataUrl.split(',')[1];
  const byteSize = (base64Part.length * 3) / 4;
  if (byteSize > MAX_BYTES) {
    throw new Error('Image is too large even after compression. Please use a smaller image.');
  }

  return dataUrl;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
