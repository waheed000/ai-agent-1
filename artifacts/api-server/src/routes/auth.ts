import { Router } from "express";

const router = Router();

const mockUser = {
  id: "user-1",
  name: "Alex Rivera",
  email: "alex@creatoros.ai",
  category: "entrepreneur",
  plan: "pro",
  avatarUrl: null,
};

router.post("/auth/login", (req, res) => {
  res.json({ token: "mock-jwt-token", user: mockUser });
});

router.post("/auth/register", (req, res) => {
  const { name, email, category } = req.body;
  res.status(201).json({
    token: "mock-jwt-token",
    user: { ...mockUser, name: name || mockUser.name, email: email || mockUser.email, category: category || "entrepreneur" },
  });
});

router.get("/auth/me", (_req, res) => {
  res.json(mockUser);
});

export default router;
