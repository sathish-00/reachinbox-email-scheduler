import { prisma } from "../config/database";

export const findOrCreateGoogleUser = async (profile: {
  googleId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}) => {
  return prisma.user.upsert({
    where: {
      googleId: profile.googleId,
    },
    update: {
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    },
    create: {
      googleId: profile.googleId,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    },
  });
};