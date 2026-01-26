@@ -----------------------------------------------------------------------------
@@ MUSHcode Standard Library: Lists
@@ File: src/stdlib/lists.mu
@@ -----------------------------------------------------------------------------

@@ Function: safe_map(list, attr_to_call, sep)
@@ Description: A robust mapping function that applies an attribute to each element.
@@ Usage: [u(lib.lists.map, <list>, <attr>, <sep>)]
&lib.lists.map #123=[iter(%0, u(%1, ##), %2)]

@@ Function: filter(list, attr_to_call, sep)
@@ Description: Returns elements for which attr_to_call returns true (1).
&lib.lists.filter #123=[iter(%0, switch(u(%1, ##), 1, ##, ), %2)]
