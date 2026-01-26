/// <reference types="jest" />
import { formatter } from "../formatter";

test("Compression honors trailing spaces.", async () => {
  const { data } = await formatter.format(
    "\nThis is a\n test! \nThis is a \n test!"
  );
  expect(data).toContain("This is a test!");
  expect(data).toContain("This is atest!");
});

test("lines that begin with @@ are preserved.", async () => {
  const { data } = await formatter.format(
    "\n@@ This is a\n test! \nThis is a \n test!"
  );
  expect(data).toContain("@@ This is a");
  expect(data).toContain("test!");
});

test("URLs are not destroyed during compression", async () => {
  const { data } = await formatter.format("Connect to http://google.com for info.");
  expect(data).toContain("Connect to http://google.com for info.");
});

test("Comments inside strings are preserved", async () => {
  const { data } = await formatter.format('const x = "// not a comment";');
  expect(data).toContain('const x = "// not a comment";');
});

test("Safe Splitter handles large attribute sets", async () => {
  const prefix = "&DESC HERE=";
  const longContent = "A".repeat(8100);
  const input = prefix + longContent;

  const { data } = await formatter.format(input);

  // Should have split into at least two commands
  const lines = data.split("\n");
  expect(lines.length).toBeGreaterThan(1);
  
  // First line checks
  expect(lines[0].length).toBeLessThanOrEqual(8192);
  expect(lines[0]).toMatch(/^&DESC HERE=A+/);
  
  // Second line checks (side-chain)
  expect(lines[1]).toMatch(/^@wait 0=&DESC HERE=\[get\(HERE\/DESC\)\]A+/);
  
  // Total content check (rough check if lengths add up)
  // The first line will take ~8000 chars.
  // The second line will take the rest (~100 chars).
});

test("Safe Splitter respects SAFE_LIMIT and safe boundaries", async () => {
   // Construct a string where the 8000th char is inside a function call or bracket
   // "A" * 7990 + "[get(me)]" (length 9) -> ends at 7999.
   // "A" * 7995 + "[get(me)]" -> 7995 + 9 = 8004.
   // Split should NOT happen at 8000 (inside `get(`).
   // It should happen before `[`.
   
   const safePadding = "A".repeat(7995);
   const unsafeSegment = "[get(me)]"; // 9 chars
   const suffix = "B".repeat(100);
   
   const input = "&DESC HERE=" + safePadding + unsafeSegment + suffix;
   
   const { data } = await formatter.format(input);
   const lines = data.split("\n");
   
   // First line should NOT contain partial `[get`.
   // It should end with `A...A` (7995 As) and NOT include `[` because that would make it > 8000?
   // Wait. 
   // &DESC HERE= (11 chars)
   // + 7995 As = 8006 chars. > 8000.
   // So it MUST split within the As.
   // 11 + X <= 8000. X <= 7989.
   // So it mimics "A".repeat(7989).
   // Result: &DESC HERE=AAAA...(7989 As)
   // Next: @wait 0=... [get..] AAAA(rest) [get(me)] ...
   
   expect(lines[0].length).toBeLessThanOrEqual(8000);
   expect(lines[0]).not.toMatch(/\[get$/);
   expect(lines[0]).not.toMatch(/\[$/);
});
