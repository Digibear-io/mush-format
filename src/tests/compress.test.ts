/// <reference types="jest" />
import { formatter } from "../formatter";

test("Compression honors trailing spaces.", async () => {
  const { data } = await formatter.format(
    "\nThis is a\n test! \nThis is a \n test!"
  );
  expect(data).toContain("This is a test!");
  expect(data).toContain("This is atest!");
});
