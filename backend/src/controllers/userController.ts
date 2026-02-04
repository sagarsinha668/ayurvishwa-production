import { Request, Response } from "express";
import {
  getAllUsers as getAllUsersService,
  createUser as createUserService,
  updateUser as updateUserService,
  changeUserPassword as changeUserPasswordService,
  getUserById as getUserByIdService,
  CreateUserData,
  UpdateUserData,
} from "../services/userService";
import { login as loginService, LoginData } from "../services/authService";
import { UserRole } from "../types";
import { AuthRequest } from "../middlewares/authMiddleware";

// ============================================
// AUTHENTICATION ROUTES
// ============================================

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const loginData: LoginData = { email, password };

    const result = await loginService(loginData);

    // Set JWT token in HTTP-only cookie
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Return only user object with name and email (no token in response)
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
      },
    });
  } catch (error: any) {
    if (error.message === "Invalid email or password") {
      res.status(401).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message,
    });
  }
};

// ============================================
// ADMIN USER MANAGEMENT ROUTES
// ============================================

export const getAllUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await getAllUsersService({ page, limit });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

export const createUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      fullName,
      email,
      password,
      userRoles,
      departments,
      specializations,
      consultationFee,
      extraLine,
    } = req.body;

    // Input validation
    if (
      !fullName ||
      !email ||
      !password ||
      !userRoles ||
      userRoles.length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "Full name, email, password, and at least one user role are required",
      });
      return;
    }

    const userData: CreateUserData = {
      fullName,
      email,
      password,
      userRoles: userRoles as UserRole[],
      departments,
      specializations,
      consultationFee,
      extraLine,
    };

    const user = await createUserService(userData);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error: any) {
    if (
      error.message.includes("Email already exists") ||
      error.code === 11000
    ) {
      res.status(400).json({ success: false, message: "Email already exists" });
      return;
    }
    if (error.message.includes("Password validation failed")) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const {
      fullName,
      email,
      password,
      userRoles,
      departments,
      specializations,
      consultationFee,
      extraLine,
    } = req.body;

    const updateData: UpdateUserData = {
      fullName,
      email,
      password,
      userRoles,
      departments,
      specializations,
      consultationFee,
      extraLine,
    };

    const updatedUser = await updateUserService(userId as string, updateData);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.message === "User not found") {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (
      error.message.includes("Email already exists") ||
      error.code === 11000
    ) {
      res.status(400).json({ success: false, message: "Email already exists" });
      return;
    }
    if (error.message.includes("Password validation failed")) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

export const changeUserPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      res
        .status(400)
        .json({ success: false, message: "New password is required" });
      return;
    }

    await changeUserPasswordService(userId as string, newPassword);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    if (error.message === "User not found") {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error.message.includes("Password validation failed")) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await getUserByIdService(userId as string);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error.message === "User not found") {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// ============================================
// USER PROFILE ROUTES
// ============================================

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Unauthorized: No user found" });
      return;
    }

    // Return user data from JWT token (no database call needed)
    res.status(200).json({
      success: true,
      data: {
        user: {
          name: req.user.name,
          email: req.user.email,
          roles: req.user.roles,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Clear the JWT token cookie
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Immediately expire the cookie
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error during logout",
      error: error.message,
    });
  }
};

// ============================================
// Add other user role routes here (doctor, receptionist, etc.)
// ============================================
