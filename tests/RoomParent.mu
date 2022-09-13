/*
#############################################################################
#### Global Room Parent #####################################################

This is the global room parent.  All rooms are children of this room.

See SETUP for instructions on how to use this room.

#############################################################################
*/

think Starting setup of Global Room Parent.
@set me=quiet

// If the global room parent doesn't exist, creatie it.
@if not(hasattr(me, d.grp)) = {
		@dig Global Room Parent <GRP>;
		// save a copy of the GRP dbref onto your alt.
		@fo me = &d.grp %# = [lastcreate(me, r)];
		@set [v(d.grp)] = safe float inherit
	}

@if not(hasattr(me, d.gep)) = {
		@open Global Exit Parent <GEP>;
		// save a copy of the GRP dbref onto your alt.
		@fo me = &d.gep %# = [lastcreate(me, r)];
	}

// Default room description.
@desc [v(d.grp)] = 
	This is the base description for the %chglobal room parent%cn.  If 
	you're seeing this message then it means that the description for 
	for this places still needs to be written!  Uh oh!%r %r
	For a list of available commands in this rooom, type 
	'%ch%c+roomparent%cn.'

/*
===========================================================================
  == name Format (@nameformat) ==============================================

  Format the name of the parent room.

  ---------------------------------------------------------------------------
*/

@nameformat [v(d.grp)] = 
	[center(
  	%b%ch[name(me)]
  	[if(
    	orflags(%#,wWZ), 
    	%([num(me)][flags(me)]%)%cn%b,    	
  	)],
    width(%#), =
  )]

/*
==============================================================================
== desc format (@descformat) =================================================

Format the description of the parent room.

------------------------------------------------------------------------------
*/

@descformat [v(d.grp)] = %r%0%r

/*
  == Contents Format (@conformat) ===========================================
  ---------------------------------------------------------------------------
*/

@conformat [v(d.grp)] = 
	[center(%b%chCharacters%cn%b, width(%#), - )]
  	[iter(
  		[lcon(me,CONNECT)],
    	%r[ljust(moniker(##),25)]
    	[rjust(singletime(idle(##)),5)]%b%b
    	[mid(
      		default(##/short-desc, %ch%cxType '&short-desc me=<desc>' to set this.),
      		0,
      		sub(width(%#),33)
    	)]
  )]
  [if(not(words(lexits(me))),%r[repeat(=,width(%#))])]

/*
  ===========================================================================
  === Exit Format (@exitformat) =============================================

  Format the exits of the parent room.

  --------------------------------------------------------------------------- 
*/

@exitformat [v(d.grp)]=
	[center(%b%chExits%cn%b, width(%#), - )]%r
	[columns(
		sort(
			iter( 
				filter(me/filter.visible,lexits(me),,|),
				ifelse(
					hasflag(##, dark),
					%ch%cx[setq(0, first(rest(fullname(##),;),;))]
					[if(%q0,<[ucstr(%q0)]>%b)][name(##)],
					[setq(0, first(rest(fullname(##),;),;))]
					[if(%q0,%ch<%cn%ch%cc[ucstr(%q0)]%cn%ch>%cn%b)]
					%ch[name(##)]%cn
				)
				,|,|
			),|,|
		), 35, |
	)]
	[repeat(=,width(%#))]


/*
==============================================================================
=== filter.visible ===========================================================

Filter out invisible exits.

------------------------------------------------------------------------------
*/
&filter.visible [v(d.grp)] = 
	ifelse(
		hasflag(%0, dark),
		if(orflags(%#,:cheerwWZ), 1),
		1
	)

/*
==============================================================================
=== SETUP=====================================================================
*/

think ## Global Room PArent Settings ##
think ROOM_PARENT [v(d.grp)]
think EXIT_PARENT [v(d.gep)]
think ATTR_ACCESS short-desc visual
@set me=!quiet

#include ./file2.mu