import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./database";
import { AuthUser } from "../types/auth.types";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Google account has no email"));
        }

        const user = await prisma.user.upsert({
          where: {
            googleId: profile.id,
          },
          update: {
            name: profile.displayName,
            email,
            avatarUrl: profile.photos?.[0]?.value ?? null,
          },
          create: {
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatarUrl: profile.photos?.[0]?.value ?? null,
          },
        });

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  const authUser = user as AuthUser;
  done(null, authUser.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      done(null, false);
      return;
    }

    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;