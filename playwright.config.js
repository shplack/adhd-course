import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  use: { baseURL: process.env.COURSE_BASE_URL || "http://127.0.0.1:4173" },
  webServer: process.env.COURSE_BASE_URL
    ? undefined
    : {
        command: "npm run serve",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
      },
});
