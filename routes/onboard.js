import express from "express";
import { avatar, joinReason, location, profile } from "../controllers/onboard-controller";
import multer from "multer";
import { handleImageUpload } from "../middlewares/handleFileUpload";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.put("/join-reason", joinReason);
router.put("/profile-info", profile);
router.put("/avatar", upload.single("avatar"), handleImageUpload, avatar);
router.put("/location-permission", location)

export default router;
