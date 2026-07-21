import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fal, ApiError, ValidationError } from "@fal-ai/client";
import { corsPreflight, withCors } from "../../../lib/cors";
import { getBearerToken, verifyMobileToken } from "../../../lib/mobileJwt";
import { getProductById } from "../../../lib/products";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const maxDuration = 60;

function toDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function garmentImageDataUri(productImage: string): Promise<string> {
  const filePath = path.join(process.cwd(), "public", productImage);
  const buffer = await readFile(filePath);
  const extension = path.extname(productImage).toLowerCase();
  const mimeType = extension === ".png" ? "image/png" : "image/jpeg";
  return toDataUri(buffer, mimeType);
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

  if (!process.env.FAL_API_KEY) {
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

  let garmentImage: string;
  try {
    garmentImage = await garmentImageDataUri(product.image);
  } catch {
    return jsonResponse(
      { error: "This product's image couldn't be loaded for virtual try-on." },
      { status: 500 }
    );
  }

  const modelImage = toDataUri(Buffer.from(await photo.arrayBuffer()), photo.type);

  try {
    fal.config({ credentials: process.env.FAL_API_KEY });

    const result = await fal.subscribe("fal-ai/fashn/tryon/v1.5", {
      input: {
        model_image: modelImage,
        garment_image: garmentImage,
        category: "auto",
      },
    });

    const resultImage = result.data.images?.[0];
    if (!resultImage?.url) {
      return jsonResponse(
        { error: "Try-on generation didn't return an image. Please try a different photo." },
        { status: 502 }
      );
    }

    return jsonResponse({ imageUrl: resultImage.url });
  } catch (error) {
    if (error instanceof ValidationError) {
      const message = error.body?.detail?.[0]?.msg;
      return jsonResponse(
        {
          error:
            message ??
            "We couldn't process that photo or garment. Make sure the photo clearly shows a face and body.",
        },
        { status: 422 }
      );
    }

    if (error instanceof ApiError) {
      return jsonResponse(
        { error: "The virtual try-on service is temporarily unavailable. Please try again shortly." },
        { status: 502 }
      );
    }

    return jsonResponse(
      { error: "Something went wrong generating your try-on. Please try again." },
      { status: 500 }
    );
  }
}
