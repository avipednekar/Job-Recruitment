import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { connectTestDB, disconnectTestDB } from "./helpers/db.helper.js";

let app;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe("Test Infrastructure Smoke Test", () => {
  it("should return health check response", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("backend-api");
  });

  it("should connect to in-memory MongoDB", async () => {
    const mongoose = (await import("mongoose")).default;
    expect(mongoose.connection.readyState).toBe(1);
  });
});
