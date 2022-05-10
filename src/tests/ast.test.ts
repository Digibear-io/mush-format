import { formatter, Formatter } from "../formatter";

test("AST Generation", async () => {
  const fomrmatter = new Formatter();

  await formatter.format(
    "&CMD_BUCKET/ACCESS Job Global Object <JGO>=$+bucket/access *=*:@switch [u(%va/GIVE_ACCESS,%#)][setq(0,num(*%0))][setq(1,locate(%vc,%1,i))][isdbref(%q0)][isdbref(%q1)][u(%va/FN_ACCESSCHECK,%q1,%q0)]=0*,{@pemit %#=Permission denied.},10*,{@pemit %#=There is no player by that name.},110*,{@pemit %#=There is no bucket by that name.},1110*,{@pemit %#=You have given [name(%q0)] access to the [name(%q1)] bucket.;&JOBSB %q0=[ifelse(member(get(%q0/JOBSB),%q1),remove(get(%q0/JOBSB),%q1),setunion(get(%q0/JOBSB),%q1))]},{@pemit %#=You have removed [name(%q0)]'s access to the [name(%q1)] bucket.;&JOBSB %q0=[ifelse(member(get(%q0/JOBSB),%q1),remove(get(%q0/JOBSB),%q1),setunion(get(%q0/JOBSB),%q1))]}"
  );
});
