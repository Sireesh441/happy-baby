import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { corsPreflight, withCors } from "../../../lib/cors";
import { getBearerToken, verifyMobileToken } from "../../../lib/mobileJwt";
import { getProductById } from "../../../lib/products";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const TRYON_SERVICE_URL = process.env.TRYON_SERVICE_URL ?? "http://localhost:4002";

// tryon-service's own Hugging Face call chains through a Gradio Space;
// ZeroGPU cold starts plus diffusion inference can run long. Vercel plan
// tier may cap this lower than requested regardless (60s on Hobby).
export const maxDuration = 120;

async function garmentImageBlob(productImage: string): Promise<Blob> {
  const filePath = path.join(process.cwd(), "public", productImage);
  const buffer = await readFile(filePath);
  const extension = path.extname(productImage).toLowerCase();
  const mimeType = extension === ".png" ? "image/png" : "image/jpeg";
  return new Blob([buffer], { type: mimeType });
}

function jsonResponse(body: unknown, init?: { status?: number }) {
  return withCors(NextResponse.json(body, init));
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const user = token ? verifyMobileToken(token) : null;
  if (!user) {
    return jsonResponse({ error: "You must be logged in to use virtual try-on." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonResponse({ error: "Expected multipart form data." }, { status: 400 });
  }

  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return jsonResponse({ error: "Please upload a photo of yourself." }, { status: 400 });
  }

  if (!photo.type.startsWith("image/")) {
    return jsonResponse({ error: "The uploaded photo must be an image file." }, { status: 400 });
  }

  if (photo.size > MAX_PHOTO_BYTES) {
    return jsonResponse(
      { error: "Photo is too large. Please upload an image under 10MB." },
      { status: 400 }
    );
  }

  // Two request shapes: a single productId (existing single-garment flow),
  // or upperProductId + lowerProductId together (outfit flow -- a top and
  // a bottom composited onto the person in one call). Which one this
  // request is depends on which field(s) are present, mirroring how
  // tryon-service's own /api/try-on infers single vs. outfit from which
  // image fields were uploaded.
  const productIdRaw = formData.get("productId");
  const upperProductIdRaw = formData.get("upperProductId");
  const lowerProductIdRaw = formData.get("lowerProductId");

  const hasSingle = productIdRaw !== null;
  const hasOutfit = upperProductIdRaw !== null || lowerProductIdRaw !== null;

  if (hasSingle && hasOutfit) {
    return jsonResponse(
      { error: 'Send either "productId" (single item) or both outfit product ids, not both.' },
      { status: 400 }
    );
  }

  const personImage = new Blob([await photo.arrayBuffer()], { type: photo.type });
  const tryOnForm = new FormData();
  tryOnForm.append("personImage", personImage, "photo.jpg");

  if (hasOutfit) {
    const upperProductId = Number(upperProductIdRaw);
    const lowerProductId = Number(lowerProductIdRaw);

    if (!Number.isFinite(upperProductId) || !Number.isFinite(lowerProductId)) {
      return jsonResponse(
        { error: "A valid upperProductId and lowerProductId are both required for an outfit try-on." },
        { status: 400 }
      );
    }

    const [upperProduct, lowerProduct] = await Promise.all([
      getProductById(upperProductId),
      getProductById(lowerProductId),
    ]);

    if (!upperProduct || !lowerProduct) {
      return jsonResponse({ error: "One of the selected products couldn't be found." }, { status: 404 });
    }
    if (!upperProduct.image || !lowerProduct.image) {
      return jsonResponse(
        { error: "One of the selected products doesn't have a photo available for virtual try-on yet." },
        { status: 400 }
      );
    }

    let upperGarmentImage: Blob;
    let lowerGarmentImage: Blob;
    try {
      [upperGarmentImage, lowerGarmentImage] = await Promise.all([
        garmentImageBlob(upperProduct.image),
        garmentImageBlob(lowerProduct.image),
      ]);
    } catch {
      return jsonResponse(
        { error: "One of the selected products' images couldn't be loaded for virtual try-on." },
        { status: 500 }
      );
    }

    tryOnForm.append("upperGarmentImage", upperGarmentImage, upperProduct.image);
    tryOnForm.append("lowerGarmentImage", lowerGarmentImage, lowerProduct.image);
  } else {
    const productId = Number(productIdRaw);
    if (!Number.isFinite(productId)) {
      return jsonResponse({ error: "A valid productId is required." }, { status: 400 });
    }

    const product = await getProductById(productId);
    if (!product) {
      return jsonResponse({ error: "Product not found." }, { status: 404 });
    }
    if (!product.image) {
      return jsonResponse(
        { error: "This product doesn't have a photo available for virtual try-on yet." },
        { status: 400 }
      );
    }

    let garmentImage: Blob;
    try {
      garmentImage = await garmentImageBlob(product.image);
    } catch {
      return jsonResponse(
        { error: "This product's image couldn't be loaded for virtual try-on." },
        { status: 500 }
      );
    }

    tryOnForm.append("garmentImage", garmentImage, product.image);
    tryOnForm.append("garmentDescription", product.name);
  }

  try {
    const response = await fetch(`${TRYON_SERVICE_URL}/api/try-on`, {
      method: "POST",
      body: tryOnForm,
    });

    const data = await response.json().catch(() => ({}));

    // tryon-service returns 422 specifically when the provider responded
    // but the photo itself couldn't be turned into a usable result (e.g.
    // its NSFW-placeholder detection) -- a "pick a different photo"
    // situation, distinct from a provider/network failure. Forward that
    // exact message and status rather than collapsing it into the generic
    // 502 below, so the app can show the real reason instead of a vague
    // "something went wrong."
    if (response.status === 422 && typeof data.error === "string") {
      return jsonResponse({ error: data.error }, { status: 422 });
    }

    if (!response.ok || typeof data.imageUrl !== "string") {
      console.error("tryon-service request failed:", response.status, data);
      return jsonResponse(
        {
          error:
            "We couldn't process that photo. Make sure it clearly shows your face and body, and try again.",
        },
        { status: 502 }
      );
    }

    return jsonResponse({ imageUrl: data.imageUrl });
  } catch (error) {
    console.error("Virtual try-on generation failed:", error);
    return jsonResponse(
      { error: "Virtual try-on is temporarily unavailable. Please try again shortly." },
      { status: 502 }
    );
  }
}
