import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dataRouter from "./data";
import documentsRouter from "./documents";
import extractionRouter from "./extraction";
import menuRouter from "./menu";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dataRouter);
router.use(documentsRouter);
router.use(extractionRouter);
router.use(menuRouter);

export default router;
