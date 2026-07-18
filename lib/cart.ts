import { prisma } from "./prisma";
import { toProduct } from "./products";
import type { Product } from "../app/data/products";

export type CartLine = {
  productId: number;
  quantity: number;
  product: Product;
};

export async function getCart(cartId: string): Promise<CartLine[]> {
  const rows = await prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true },
    orderBy: { id: "asc" },
  });

  return rows.map((row) => ({
    productId: row.productId,
    quantity: row.quantity,
    product: toProduct(row.product),
  }));
}

export async function addToCart(cartId: string, productId: number, quantity: number): Promise<void> {
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity },
    update: { quantity: { increment: quantity } },
  });
}

export async function setCartItemQuantity(
  cartId: string,
  productId: number,
  quantity: number
): Promise<void> {
  if (quantity <= 0) {
    await removeFromCart(cartId, productId);
    return;
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity },
    update: { quantity },
  });
}

export async function removeFromCart(cartId: string, productId: number): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId, productId } });
}

export async function clearCart(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}
