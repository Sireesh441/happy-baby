import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { Client } from "@gradio/client";
import { corsPreflight, withCors } from "../../../lib/cors";
import { getBearerToken, verifyMobileToken } from "../../../lib/mobileJwt";
import { getProductById } from "../../../lib/products";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const HF_SPACE = "yisol/IDM-VTON";

// ZeroGPU cold starts plus diffusion inference can run long; Vercel plan tier
// may cap this lower than requested regardless (60s on Hobby).
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

  if (!process.env.HF_TOKEN) {
    return jsonResponse({ error: "Virtual try-on is not configured." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonResponse({ error: "Expected multipart form data." }, { status: 400 });
  }

  const photo = formData.get("photo");
  const productId = Number(formData.get("productId"));

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

  const personImage = new Blob([await photo.arrayBuffer()], { type: photo.type });

  try {
    const client = await Client.connect(HF_SPACE, { token: process.env.HF_TOKEN as `hf_${string}` });

    const result = await client.predict("/tryon", {
      dict: { background: personImage, layers: [], composite: personImage },
      garm_img: garmentImage,
      garment_des: product.name,
      is_checked: true,
      is_checked_crop: true,
      denoise_steps: 30,
      seed: Math.floor(Math.random() * 1_000_000),
    });

    const data = result.data as Array<{ url?: string; path?: string } | undefined>;
    const resultImage = data?.[0];
    const imageUrl = resultImage?.url ?? resultImage?.path;

    if (!imageUrl) {
      return jsonResponse(
        { error: "Try-on generation didn't return an image. Please try a different photo." },
        { status: 502 }
      );
    }

    return jsonResponse({ imageUrl });
  } catch (error) {
    console.error("Virtual try-on generation failed:", error);
    return jsonResponse(
      {
        error:
          "We couldn't process that photo. Make sure it clearly shows your face and body, and try again.",
      },
      { status: 502 }
    );
  }
}
