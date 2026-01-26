/// <reference types="jest" />
import { formatter } from "../formatter";
import * as fs from "fs";
import { join } from "path";

describe("Circular Dependency Detection", () => {
  const tempDir = join(__dirname, "../../tmp_test");
  const fileA = join(tempDir, "fileA.mu");
  const fileB = join(tempDir, "fileB.mu");

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    fs.writeFileSync(fileA, "#include fileB.mu\n");
    fs.writeFileSync(fileB, "#include fileA.mu\n");
  });

  afterAll(() => {
    if (fs.existsSync(fileA)) fs.unlinkSync(fileA);
    if (fs.existsSync(fileB)) fs.unlinkSync(fileB);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  });

  test("Should report error on circular #include", async () => {
    const { data } = await formatter.format(fileA);
    expect(data).toContain("Circular dependency detected");
  });
});
