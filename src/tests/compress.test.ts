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
