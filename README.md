# nomad-live-api
================
This repository is setup with Circle CI. Everytime you push a new update onto the `production` branch, the code goes live.

All those endpoints have been inspired from the Twitter API.

### Swaggered methods
```
GET users/lookup
- screenname_list | user_id_list

GET users/show
- screenname_list | user_id_list

GET users/search
- q
- page
- count
- fields
- sort

POST users/report_spam

GET search/streams :
- q
- geocode : lat + lon + rad
- result_type : recent | popular
- count
- until


GET streams/show/:id
- id: numerical id of desired stream
POST streams/destroy/:id
- id: numerical id of desired stream
POST streams/update
- infos : A textual description of the stream
- lat :
- lon : 
- place_id :

GET streams/lookup : |
Returns multiple streams (per id)
- id_list : []
```


### Planned
```
GET streams/restream/:id
- id: numerical id of desired stream

POST streams/restream/:id
GET streams/restreamers/ids

GET account/settings
GET account/verify_credentials
POST account/settings
POST account/update_profile
- name
- url
- location
- description
POST account/update_profile_image
- image: base64

GET geo/id/:place_id
GET geo/reverse_geocode
GET geo/search
- lat + long | ip | q

POST geo/place

```


### Extra
```
GET friends/ids (following)
- user_id : mandatory?
- screen_name : mandatory?
- cursor
- count
-> cur_cursor
-> previous_cursor
-> next_cursor

GET followers/ids
- user_id : mandatory?
- screen_name : mandatory?
- cursor
- count
-> cur_cursor
-> previous_cursor
-> next_cursor

GET friendships/incoming : |
Returns a collection of numeric IDs for every user who has a pending request to follow the authenticating user.

GET friendships/outgoing

POST friendships/create
- user_id: mandatory?
- screen_name: mandatory?
- follow: notify or not
POST friendships/destroy

POST friendships/update

GET friendships/show : |
At least source or target.
- source_id
- source_screen_name
- target

GET friends/list
- user(id|screen_name)
- cursor

GET followers/list

GET friendships/lookup : |
- screenname_list | user_id_list



GET favorites/list
POST favorites/destroy
POST favorites/create

GET events/place
GET events/available
GET events/closest
```