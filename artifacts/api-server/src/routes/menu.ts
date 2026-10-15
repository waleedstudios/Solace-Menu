import { Router } from "express";
import { GetPublicMenuParams, GetRestaurantMenuParams } from "@workspace/api-zod";
import { localUser, authorizeRestaurant, HttpError } from "../lib/auth";
import { readPublicMenu, readRestaurantMenu } from "../lib/menu";

const router = Router();
router.get("/public-menu/:slug", async (req, res) => {
  const parsed = GetPublicMenuParams.safeParse(req.params);
  if (!parsed.success) throw new HttpError(400, "Invalid menu URL.");
  const { slug } = parsed.data;
  res.setHeader("Cache-Control", "no-store");
  res.json(await readPublicMenu(slug));
});
router.get("/restaurants/:restaurantId/menu", async (req, res) => {
  const parsed = GetRestaurantMenuParams.safeParse(req.params);
  if (!parsed.success) throw new HttpError(400, "Invalid restaurant ID.");
  const { restaurantId } = parsed.data;
  const user = (await localUser(req))!;
  const role = await authorizeRestaurant(user.id, restaurantId);
  res.setHeader("Cache-Control", "private, no-store");
  res.json(await readRestaurantMenu(restaurantId, user.id, role === "owner" || role === "manager"));
});
export default router;
