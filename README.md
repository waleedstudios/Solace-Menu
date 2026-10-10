# Macro Menu Maestro

Build me a full-stack SaaS web application called “MacroMenu”.

OVERVIEW:

MacroMenu is a platform where restaurants can log in, input their menu items and recipes, and automatically generate accurate macro calculations (calories, protein, carbs, fats). Each restaurant will also have a public-facing interactive menu page that customers can view.

----------------------------------------

AUTHENTICATION:

- Users can sign up and log in as restaurant owners

- Each user has their own dashboard

- Secure authentication system

----------------------------------------

DATABASE STRUCTURE:

Create the following data models:

1. Users

- id

- restaurant_name

- email

- password

2. Ingredients

- id

- name

- calories_per_100g

- protein_per_100g

- carbs_per_100g

- fats_per_100g

3. PortionUnits

- id

- name (e.g., scoop, ladle, slice, cup)

- average_grams

- min_grams (optional)

- max_grams (optional)

- user_id (so each restaurant defines their own portions)

4. MenuItems

- id

- name

- description

- image_url

- user_id

5. RecipeItems

- id

- menu_item_id

- ingredient_id

- grams

- portion_unit_id (optional)

----------------------------------------

CORE FEATURES:

1. RESTAURANT DASHBOARD

- Create, edit, and delete menu items

- Add ingredients to each menu item

- Input ingredient amounts in grams OR by portion unit (like “1 scoop”)

- If portion unit is used, convert it into grams using stored averages

2. MACRO CALCULATION ENGINE

- Automatically calculate:

  calories, protein, carbs, fats

- Formula:

  (grams / 100) × per-100g macros

- Sum all ingredients to get total macros per menu item

3. PORTION STANDARDIZATION SYSTEM

- Restaurants can define portion units (e.g., scoop = 150g)

- Require users to input average grams for each portion

- Allow optional min/max range for accuracy tracking

4. PUBLIC MENU PAGE

- Each restaurant gets a unique public URL:

  /restaurant/{restaurant_name}

- Display:

  - menu items

  - images

  - total calories and macros

- Clean, mobile-first design

----------------------------------------

UI / UX REQUIREMENTS:

- Clean, modern UI (similar to a food delivery app)

- Mobile-friendly first

- Dashboard should be simple and intuitive

- Use cards for menu items

- Use modals or forms for adding ingredients

----------------------------------------

ADMIN EXPERIENCE:

- Easy ingredient search or manual entry

- Allow saving custom ingredients

- Show live macro updates as ingredients are added

----------------------------------------

IMPORTANT RULES:

- Do NOT allow vague inputs like “a little” or “some”

- Force structured inputs:

  grams OR defined portion units

- Always calculate macros based on standardized values

----------------------------------------

PHASE 2 PREPARATION (structure only, no UI yet):

Prepare the system to support modifiers in the future:

- Add/remove ingredients (e.g., no cheese, extra protein)

- Dynamic macro updates

----------------------------------------

DESIGN STYLE:

- Minimal, modern, clean

- White background, subtle shadows

- Professional SaaS look (not playful/cartoonish)

----------------------------------------

GOAL:

The goal is to create a functional MVP where:

- Restaurants can input recipes

- Macros are automatically calculated

- Customers can view a clean macro-based menu

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8dd581a-fdd6-41ff-8f91-c1d09a1c6356).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
