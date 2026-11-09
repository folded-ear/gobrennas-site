# Profile

State: Agreed  
Delivery: Built

## Purpose

The Profile page holds what concerns the signed-in user and the device in
hand: logging out, setting up the device, and seeing the devices the user
has used.

## Behavior

- The header shows the user's avatar before the Profile title, and Log Out
  at its far end. While the page loads, the header shows and Log Out works.
- Logging out warns first when changes haven't reached the server yet. They
  stay on the device and are sent once the same user signs in again.
- On a phone or tablet, the page offers to install the app until it is
  installed. The installed app opens on Shopping, with shortcuts to Shop,
  Plan, and Library.
- The page offers Cook This, a bookmark that imports the recipe being viewed
  online into the Library. The bookmark is connected to the user's account.
- The page lists the user's devices by name, each with the day it was last
  used, and stars the device in use. The day reads "Today" or "Yesterday";
  else as a weekday and date within about three months; else as a numeric
  date.
- Developers have a Dev Mode switch, set for each device separately. While
  it is on, the page shows when the running version was built and the sizes
  of the screen and viewport, and on large screens the device list shows
  each device's key.

## Not included

- Changing the user's name or avatar.
- Renaming or removing devices.

## Open questions

- None.

## Related documents

- [Navigation](navigation.md)
- [Domain model](../domain/model.md)
