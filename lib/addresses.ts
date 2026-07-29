import { prisma } from "./prisma";

export type Address = {
  id: number;
  userId: number;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
};

function toAddress(row: {
  id: number;
  userId: number;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: Date;
}): Address {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    phone: row.phone,
    line1: row.line1,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}

export type CreateAddressInput = {
  userId: number;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const row = await prisma.address.create({ data: input });
  return toAddress(row);
}

export async function getAddressesForUser(userId: number): Promise<Address[]> {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: { id: "desc" },
  });
  return rows.map(toAddress);
}
