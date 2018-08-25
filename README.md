# Mobile Web Specialist Certification Course
---
#### _Three Stage Course Material Project - Restaurant Reviews_

There are many changes here (all to the restaurant page), the foremost of which is that there's a form for posting reviews.

There's also a button for liking a restaurant

I added a toast messenger for when posts succeed or fail

There are few issues I'm aware of. These are thus: after posts timeout more than 10 times, I should do something other than tell the user to reload and try again.

The map state can get into a weird situation on the regular sized iPad when the user goes from portrait to landscape without opening the map first. It's... annoying. I'm not sure how to fix it or deal with it.

There's a lot of refactoring I need to do. Specifically, I need to move all of the actual html creation code out of the main app pages. I can/should also create a simple html creation class/function to handle making these components. That would greatly simplify the app, and speed it up, potentially.

Anyway, those are the things I should/will do. Eventually...

## Project 3 Solution

Download repo


Run 'npm i'


Run 'npm run imgopt'


#### For basic unoptimized code


Run 'npm start' 


#### Or for optimized code


Run 'npm run start:production'


#### To build code without running
(For whatever reason)


Run 'npm run build'


## For Server Stuff


Open a new terminal window and go git (:P) the server
from [here](https://github.com/aretheregods/mws-restaurant-stage-3.git)


Run 'npm i' in the resulting folder

Run 'npm start' once that's done


Open localhost:8080 in the browser


