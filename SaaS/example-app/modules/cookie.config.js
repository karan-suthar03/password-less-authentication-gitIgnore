const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const isSecure = frontendOrigin.startsWith("https://");

export const baseCookieOptions = {
  httpOnly: true,
  sameSite: isSecure ? "none" : "lax",
  ...(isSecure && { secure: true }),
};
