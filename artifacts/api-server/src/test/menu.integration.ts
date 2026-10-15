// Dedicated fake fixtures only. Run with tsx; no Clerk credentials required.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { initializeRecipeMenuSync, readPublicMenu, readRestaurantMenu } from "../lib/menu";

const owner = randomUUID(), restaurant = randomUUID(), base = randomUUID(), sauceIngredient = randomUUID();
const dish = randomUUID(), sauce = randomUUID(), empty = randomUUID(), modernHidden = randomUUID(), otherOwner = randomUUID(), otherRestaurant = randomUUID();
const legacy = randomUUID(), legacyHidden = randomUUID(), slug = `sync-fixture-${randomUUID()}`;
const forbidden = new Set(["current_cost", "packaging_cost", "instructions", "supplier_code", "vendor_id", "batchCost", "servingCost", "foodCostPct", "contribution", "costIssues"]);
function safeKeys(value: unknown) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) { assert.ok(!forbidden.has(key), `Private field ${key}`); safeKeys(child); }
}
async function run() {
  try {
    for (const [id, rid] of [[owner, restaurant], [otherOwner, otherRestaurant]]) {
      await pool.query("INSERT INTO auth_users (id,clerk_id,email,onboarding_completed_at) VALUES ($1,$2,$3,now())", [id, `fixture-${id}`, `${id}@example.com`]);
      await pool.query("INSERT INTO restaurants (id,owner_id,name) VALUES ($1,$2,'Sync fixture')", [rid, id]);
      await pool.query("INSERT INTO profiles (id,restaurant_name,slug,email) VALUES ($1,'Sync fixture',$2,$3)", [id, id === owner ? slug : `other-${id}`, `${id}@example.com`]);
    }
    await pool.query(`INSERT INTO ingredients (id,restaurant_id,name,base_unit,nutrition_source,current_cost,calories_per_100g,protein_per_100g,carbs_per_100g,fats_per_100g)
      VALUES ($1,$3,'Base','g','label',99.123,100,2,20,0),($2,$3,'Sauce ingredient','g','estimated',88.987,200,10,10,10)`, [base, sauceIngredient, restaurant]);
    await pool.query(`INSERT INTO recipes (id,restaurant_id,name,is_subrecipe,is_published,batch_yield_qty,batch_yield_unit,servings_per_batch,instructions,packaging_cost,selling_price)
      VALUES ($1,$4,'Fixture dish',false,true,1,'each',2,'PRIVATE PREP INSTRUCTIONS',12.34,15),
      ($2,$4,'Private sauce',true,true,200,'g',1,'PRIVATE SAUCE',9.87,NULL),
      ($3,$4,'Imported empty item',false,true,1,'each',1,NULL,0,8)`, [dish, sauce, empty, restaurant]);
    // No reliable provenance distinguishes an old default from an owner hiding
    // a dish. Both old false states must remain false through first startup.
    await pool.query("INSERT INTO recipes (id,restaurant_id,name,is_published,public_menu_synced) VALUES ($1,$2,'Older deliberately hidden dish',false,false)", [modernHidden, restaurant]);
    await pool.query("INSERT INTO recipes (restaurant_id,name,is_published,public_menu_synced) VALUES ($1,'Other owner dish',true,true)", [otherRestaurant]);
    await pool.query(`INSERT INTO recipe_lines (recipe_id,ingredient_id,sub_recipe_id,quantity,unit) VALUES
      ($1,$3,NULL,100,'g'),($1,NULL,$2,100,'g'),($2,$4,NULL,100,'g'),($5,$3,NULL,0,'g')`, [dish, sauce, base, sauceIngredient, empty]);
    await pool.query("INSERT INTO menu_items (id,user_id,name,is_published) VALUES ($1,$3,'Legacy visible',true),($2,$3,'Legacy hidden',false)", [legacy, legacyHidden, owner]);
    await pool.query("INSERT INTO recipe_items (menu_item_id,ingredient_id,grams) VALUES ($1,$2,100)", [legacy, base]);
    await initializeRecipeMenuSync();
    let menu = await readPublicMenu(slug);
    assert.equal(menu.items.length, 3);
    assert.equal(menu.items.find(i => i.id === dish)?.macros?.calories, 100);
    assert.equal(menu.items.find(i => i.id === empty)?.macros, null);
    assert.equal(menu.items.find(i => i.id === empty)?.nutrition_complete, false);
    assert.equal(menu.items.find(i => i.id === dish)?.estimated_nutrition, true);
    assert.ok(!menu.items.some(i => i.id === sauce || i.id === modernHidden || i.id === legacyHidden || i.name === "Other owner dish"));
    const preserved = (await pool.query("SELECT is_published,public_menu_synced FROM recipes WHERE id=$1", [modernHidden])).rows[0];
    assert.equal(preserved.is_published, false);
    assert.equal(preserved.public_menu_synced, true);
    assert.equal(new Set(menu.items.map(i => i.id)).size, menu.items.length);
    safeKeys(menu);
    assert.ok(!JSON.stringify(menu).includes("PRIVATE"));
    const managed = await readRestaurantMenu(restaurant, owner, true);
    assert.equal(managed.items.find(i => i.id === legacyHidden)?.is_published, false);
    assert.equal(managed.items.find(i => i.id === modernHidden)?.is_published, false);
    assert.ok(managed.items.every(i => i.can_edit));
    const manager = await readRestaurantMenu(restaurant, otherOwner, true);
    assert.equal(manager.items.find(i => i.id === dish)?.can_edit, true);
    assert.equal(manager.items.find(i => i.id === legacy)?.can_edit, false);
    const staff = await readRestaurantMenu(restaurant, otherOwner, false);
    assert.ok(staff.items.every(i => !i.can_edit));
    await pool.query("UPDATE ingredients SET calories_per_100g=300 WHERE id=$1", [base]);
    assert.equal((await readPublicMenu(slug)).items.find(i => i.id === dish)?.macros?.calories, 200);
    await pool.query("UPDATE recipe_lines SET quantity=200 WHERE recipe_id=$1 AND ingredient_id=$2", [dish, base]);
    assert.equal((await readPublicMenu(slug)).items.find(i => i.id === dish)?.macros?.calories, 350);
    await pool.query("UPDATE recipes SET servings_per_batch=4,name='Renamed fixture',description='Public description' WHERE id=$1", [dish]);
    menu = await readPublicMenu(slug);
    assert.equal(menu.items.find(i => i.id === dish)?.macros?.calories, 175);
    assert.equal(menu.items.find(i => i.id === dish)?.name, "Renamed fixture");
    await pool.query("UPDATE recipe_lines SET quantity=50 WHERE recipe_id=$1", [sauce]);
    assert.equal((await readPublicMenu(slug)).items.find(i => i.id === dish)?.macros?.calories, 162.5);
    await pool.query("UPDATE ingredients SET nutrition_source=NULL WHERE id=$1", [base]);
    assert.equal((await readPublicMenu(slug)).items.find(i => i.id === dish)?.macros, null);
    await pool.query("UPDATE recipes SET is_published=false WHERE id=$1", [dish]);
    await initializeRecipeMenuSync();
    assert.ok(!(await readPublicMenu(slug)).items.some(i => i.id === dish));
    assert.ok(!(await readPublicMenu(slug)).items.some(i => i.id === modernHidden));
    assert.equal((await pool.query("SELECT is_published FROM menu_items WHERE id=$1", [legacyHidden])).rows[0].is_published, false);
    await pool.query("DELETE FROM recipes WHERE id=$1", [empty]);
    assert.ok(!(await readPublicMenu(slug)).items.some(i => i.id === empty));
    await assert.rejects(readPublicMenu("missing-fixture-slug"), { status: 404 });
    console.info("Menu integration passed: pre-existing modern/legacy hidden visibility, safe rollout, privacy, live nested nutrition, completeness, edit flags, hide persistence and deletion.");
  } finally {
    await pool.query("DELETE FROM menu_items WHERE user_id = ANY($1::uuid[])", [[owner, otherOwner]]);
    await pool.query("DELETE FROM recipe_lines WHERE recipe_id IN (SELECT id FROM recipes WHERE restaurant_id = ANY($1::uuid[]))", [[restaurant, otherRestaurant]]);
    await pool.query("DELETE FROM restaurants WHERE id = ANY($1::uuid[])", [[restaurant, otherRestaurant]]);
    await pool.query("DELETE FROM auth_users WHERE id = ANY($1::uuid[])", [[owner, otherOwner]]);
    await pool.end();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
