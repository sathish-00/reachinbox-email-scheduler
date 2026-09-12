import { prisma } from "../config/database";

export const createSender = async (
  userId: string,
  email: string,
  displayName?: string
) => {
  return prisma.sender.create({
    data: {
      email,
      displayName,
      userId,
    },
  });
};

export const getSenders = async (userId: string) => {
  return prisma.sender.findMany({
    where: {
      userId,
      active: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};