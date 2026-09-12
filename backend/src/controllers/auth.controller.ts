import { Request, Response } from "express";

export const googleCallbackController = (
  req: Request,
  res: Response
): void => {
  if (!req.user) {
    res.redirect(
      "http://localhost:3000/login?error=google_auth_failed"
    );
    return;
  }

  res.redirect("http://localhost:3000/dashboard");
};

export const getCurrentUserController = (
  req: Request,
  res: Response
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: req.user,
  });
};

export const logoutController = (
  req: Request,
  res: Response
): void => {
  req.logout((error) => {
    if (error) {
      res.status(500).json({
        success: false,
        message: "Logout failed",
      });
      return;
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        res.status(500).json({
          success: false,
          message: "Failed to destroy session",
        });
        return;
      }

      res.clearCookie("connect.sid");

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    });
  });
};