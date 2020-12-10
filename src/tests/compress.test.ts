/// <reference types="jest" />
import { formatter } from "../formatter";

test("Compression honors trailing spaces.", async () => {
  const results = await formatter.format(
    "\nThis is a \n test!\nThis is a\n test!"
  );
  expect(results).toContain("This is a test!");
  expect(results).toContain("This is atest!");
});
