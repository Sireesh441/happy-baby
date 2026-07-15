export type OrderLineItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  emoji: string;
  color: string;
};

export type OrderRecord = {
  orderId: string;
  paymentId: string;
  items: OrderLineItem[];
  total: number;
  createdAt: string;
};

const STORAGE_KEY = "happybaby-last-order";

export function saveLastOrder(order: OrderRecord) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function getLastOrder(): OrderRecord | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as OrderRecord) : null;
  } catch {
    return null;
  }
}
