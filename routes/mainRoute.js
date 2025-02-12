import { Router } from "express";
import authRouter from "./authRoute.js";
import eventRouter from "./eventRoute.js";
import tagRouter from "./tagRoute.js";
import organizerRouter from "./organizerRoute.js";
import adminRouter from "./adminRoute.js";
import clubRouter from "./clubRoute.js";
import profileRouter from "./profileRoute.js";;
import notificationRouter from "./notificationRoute.js";
import registrationRouter from "./registrationRoute.js";

const router = Router();

router.use("/event", eventRouter);
router.use("/org", organizerRouter);
router.use("/admin", adminRouter);
router.use("/auth", authRouter);
router.use("/tag", tagRouter);
router.use("/club", clubRouter);
router.use("/notification", notificationRouter);
router.use("/registration", registrationRouter);;
router.use('/userprofile',profileRouter);

export default router;
