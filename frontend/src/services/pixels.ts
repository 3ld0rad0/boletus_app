/** Pixel RGBA di un'immagine; senza conversione di colore restano esattamente quelli codificati nel file. */
export async function readPixels(blob: Blob): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' })
  const { width, height } = bitmap
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas non disponibile')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return { width, height, data: ctx.getImageData(0, 0, width, height).data }
}
