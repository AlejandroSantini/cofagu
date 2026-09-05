import { test, expect } from "@playwright/test";
import { loginAs } from "./utils";

test.describe("Yard Flow (Playa de Camiones)", () => {
  test("should display yard loads and allow rejection", async ({ page }) => {
    // 1. Setup API Mocks
    await page.route("**/api/loads/yard*", async (route) => {
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
              id: 99,
              status: "ARRIVED_PLANT",
              origin: "Campo",
              destination: "Planta Urdinarrain",
              truck: { chassisPlate: "YARD-123" },
              driver: { name: "Pepe Grillo" },
              carrier: { name: "Logistica X" },
              timeSlot: "08:00 - 10:00",
            },
          ],
        },
      });
    });

    let rejectCalled = false;
    await page.route("**/api/loads/99/reject", async (route) => {
      rejectCalled = true;
      const postData = JSON.parse(route.request().postData() || "{}");
      expect(postData.reason).toBe("Camión no cumple los requisitos");
      await route.fulfill({
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*",
        },
        status: 200,
        json: { success: true, data: { id: 99, status: "REJECTED" } },
      });
    });

    // 2. Login as PLAYERO
    await loginAs(page, "PLAYERO");

    // 3. Go to Yard
    await page.goto("/yard");

    // 4. Verify table content
    await expect(page.getByText("YARD-123")).toBeVisible();
    await expect(page.getByText("Pepe Grillo")).toBeVisible();

    // 5. Click Reject
    await page.getByRole("button", { name: /Rechazar/i }).click();

    // 6. Fill Reject Modal
    await expect(page.getByText("Motivo de Rechazo")).toBeVisible();
    await page
      .getByPlaceholder(
        "Especifique el motivo por el cual se rechaza el camión...",
      )
      .fill("Camión no cumple los requisitos");

    // 7. Confirm Reject
    await page.getByRole("button", { name: "Rechazar Camión" }).click();

    // 8. Verify reject API was called
    expect(rejectCalled).toBe(true);
  });
});
