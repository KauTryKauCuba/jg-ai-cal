import { pdf } from "pdf-to-img";

// Resumes are rarely more than a couple of pages; cap page count so a wrong
// or oversized upload doesn't silently balloon into a huge multi-page request
// (and bill) across up to 4 vision APIs at once.
export const MAX_PAGES = 4;

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const document = await pdf(pdfBuffer, { scale: 1 });
  return document.length;
}

export async function pdfToBase64Images(pdfBuffer: Buffer): Promise<string[]> {
  const document = await pdf(pdfBuffer, { scale: 3 });
  if (document.length > MAX_PAGES) {
    throw new Error(
      `PDF has ${document.length} pages, which exceeds the ${MAX_PAGES}-page limit for this tool.`
    );
  }
  const images: string[] = [];
  for await (const pageBuffer of document) {
    images.push(pageBuffer.toString("base64"));
  }
  return images;
}
