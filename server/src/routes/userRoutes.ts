import { Router } from "express";
import { getManagers, getHODs } from "../controllers/userController";

const router = Router();

router.get("/managers", getManagers);
router.get("/hods", getHODs);

export default router;
