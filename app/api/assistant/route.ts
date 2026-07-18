import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAllProducts } from "../../../lib/products";
import { CATEGORY_META } from "../../../app/data/products";

const anthropic = new Anthropic();

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const body = await request.json();
  const messages = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const products = getAllProducts();
  const catalogLines = products
    .map((p) => `- ${p.name} | ${p.category} | ₹${p.price} | ${p.description}`)
    .join("\n");
  const categoryNames = CATEGORY_META.map((c) => c.name).join(", ");

  const systemPrompt = `You are "Ask HappyBaby", the shopping assistant for HappyBaby, an online baby products store with these categories: ${categoryNames}.

Here is the current product catalog:
${catalogLines}

When a parent describes what they need, recommend 2-3 relevant products from the catalog above and briefly explain why each fits, in one or two sentences total per product. Always refer to a product using its EXACT name as written in the catalog above, so it can be linked. Only recommend products that are actually in the catalog — never invent products. If nothing in the catalog fits well, say so honestly. Keep your whole reply concise and friendly.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: (messages as ChatMessage[]).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const reply =
      textBlock && textBlock.type === "text"
        ? textBlock.text
        : "Sorry, I couldn't come up with a suggestion right now.";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "The assistant is unavailable right now. Please try again shortly." },
      { status: 502 }
    );
  }
}
