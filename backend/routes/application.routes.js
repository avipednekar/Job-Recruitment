import { Router } from "express";

const router = Router();

router.post("/:jobId", (req, res) => {
  res.status(501).json({ message: "Not implemented yet" });
});

router.get("/", (req, res) => {
  res.status(501).json({ message: "Not implemented yet" });
});

export default router;
