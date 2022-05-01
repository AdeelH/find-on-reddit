# Changelog

## v1.5.6:
- Add option to show comment count instead of post count on extension icon when
  using auto-search.
- Update to manifest v3.
- Code improvements.

## v1.5.5:
- Can now find even more results (in some cases) by using the /duplicates
  API endpoint. (Thanks Droyk for the suggestion!)
- Can now find even more results (in some cases) by omitting the URL protocol
  when doing a fuzzy search.
- Fix bug that cause the popup to close after opening a link using ctrl + click.
  (Thanks Droyk for the report!)
- Minor bug fixes.

## v1.5.4:
- Update Handlebars.js to 4.7.7 as per https://github.com/advisories/GHSA-f2jv-r9rf-7988.

## v1.5.2:
- Fix bug in ctrl/cmd/shift/alt+click behavior. (Thanks NovaDev94 for the report!)
- Minor improvements to the options page.

## v1.5.0:
- Updated Handlebars.js to latest version to 
  include recently released security patch.
- Fixed bug that caused the popup size/zoom to change on when a hyperlink was
  clicked (https://github.com/AdeelH/find-on-reddit/issues/17,
  thanks nkmathew for the report and debugging help).
- Fixed bug that sometimes caused the search results to not render.
- Improved ajax error handling.
- Minor fixes and improvements.

## v1.4.8:
- Added option to make all links point to old.reddit.com. Enabled by default.

## v1.4.7:
- UI fixes and improvements

## v1.4.5:
- added option to sort search results
  - can sort on score, comments, age and 
    subreddit
  - default sorting preference can be set 
    in the options
- minor improvements

## v1.4.4:
- minor fixes and improvements

## v1.4.3:
- bug fixes

## v1.4.1:
- reduced extension size
- added 'exact match' option to 
  toggle between search and info 
  API endpoints
- default options for search (exact matching, 
  query-string, YT handling) can now be set 
  on the options page
- added option to allow automatic non-exact 
  search if exact search returns 0 results 
  (default: enabled)
- added option to allow automatic retry in 
  case of server/network error 
  (default: enabled)
- both exact and non-exact search results 
  are now cached for each URL 
  simultaneously
- UI improvement: toggling the checkboxes
  in the popup automatically initiates
  the search without the user needing to 
  press the search button
- UI improvement: automatically uncheck 
  'ignore query string' if YT video detected
- UI improvement: clear old badge on 
  URL update
- added option to post/repost link to Reddit 
  from the popup
- other fixes and improvements

## v1.3.2:
- fixed bug in caching implementation

## v1.3.1:
- added auto-search feature
- added options page
- minor fixes and improvements

## v1.2.1:
- ignore query-string by default
- workaround for leading dashes in YT video
  IDs being interpreted as boolean NOT by
  Reddit search
- minor fixes and improvements