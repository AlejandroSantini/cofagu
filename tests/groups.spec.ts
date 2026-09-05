import { test, expect } from "@playwright/test";
import { loginAs } from "./utils";

test.describe("Groups Flow", () => {
  test("should display mixed member types and toggle correctly when adding", async ({
    page,
  }) => {
    // 1. Setup API Mocks
    await page.route("**/api/groups", async (route) => {
      await route.fulfill({
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*",
        },
        status: 200,
        json: {
          success: true,
          data: [
            {
              id: 1,
              name: "Grupo Mixto Sur",
              description: "Grupo de prueba",
              members: [],
            },
          ],
        },
      });
    });

    await page.route("**/api/groups/1", async (route) => {
      await route.fulfill({
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*",
        },
        status: 200,
        json: {
          success: true,
          data: {
            id: 1,
            name: "Grupo Mixto Sur",
            description: "Grupo de prueba",
            members: [
              {
                id: "10",
                name: "Transportes SA",
                member_type: "carrier",
                carrier_id: 10,
              },
              {
                id: "20",
                name: "Logistica Interna",
                member_type: "logistics",
                user_id: 20,
              },
            ],
          },
        },
      });
    });

    await page.route("**/api/carriers", async (route) => {
      await route.fulfill({
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*",
        },
        status: 200,
        json: {
          success: true,
          data: [{ id: 30, name: "Transportes Nuevo" }],
        },
      });
    });

    await page.route("**/api/users*", async (route) => {
      await route.fulfill({
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*",
        },
        status: 200,
        json: {
          success: true,
          data: [
            { id: 40, name: "Usuario Logistica Nuevo", role: "LOGISTICS" },
          ],
        },
      });
    });

    // 2. Login as ADMIN
    await loginAs(page, "ADMIN");

    // 3. Navigate to group details
    await page.goto("/groups/1");

    // 4. Check if badges are present for mixed members
    await expect(page.getByText("Transportes SA")).toBeVisible();
    await expect(page.getByText("Logística").first()).toBeVisible();

    await expect(page.getByText("Logistica Interna")).toBeVisible();

    // 5. Verify radio button toggle for member type
    const carrierRadio = page.getByLabel("Transportista");
    const logisticsRadio = page.getByLabel("Usuario de Logística");

    await expect(carrierRadio).toBeChecked();

    // Toggle to Logistics
    await logisticsRadio.click();
    await expect(logisticsRadio).toBeChecked();
  });
});
