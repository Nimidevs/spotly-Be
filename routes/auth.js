import express from "express";
import signUp from "../controllers/signup-controller.js";
import logIn from "../controllers/login-controller.js";
import refreshToken from "../controllers/refresh-controller.js";
import logOut from "../controllers/logout-controller.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", logIn);
router.post("/refresh", refreshToken);
router.post("/signout", logOut);

export default router;
