import { format } from "./formatter";

(async () => {
  console.log(
    await format(`
// This is a test!
@pemit %# = 
    this is a test!
    Of the emergency broadcast system!

// Another test of the comments!
@pemit %#=MWa hahahahaha!`)
  );
})();
