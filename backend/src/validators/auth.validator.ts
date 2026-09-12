export const validateGoogleProfile = (
  googleId: string | undefined,
  email: string | undefined,
  name: string | undefined
): string | null => {
  if (!googleId) {
    return "Google ID is required";
  }

  if (!email) {
    return "Google email is required";
  }

  if (!name) {
    return "Google name is required";
  }

  return null;
};