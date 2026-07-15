import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";
import insightsRouter from "./insights";
import contentRouter from "./content";
import competitorsRouter from "./competitors";
import trendsRouter from "./trends";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(analyticsRouter);
router.use(insightsRouter);
router.use(contentRouter);
router.use(competitorsRouter);
router.use(trendsRouter);
router.use(reportsRouter);

export default router;
