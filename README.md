
//IT Helpdesk Management System - API Gateway & Microservices 

//Part 1 - Project Structure and JSON Data Storage
- We build an IT Helpdesk Management System using Node.js, Express, CORS, and Axios.
- We separate the application into three independent services and a web client:
  - gateway/gateway.js and gateway/routes.js (API Gateway on port 3000)
  - user-service/user.js (User Microservice on port 3001)
  - ticket-service/ticket.js (Ticket Microservice on port 3002)
  - client/index.html, client/client.js, and client/style.css (Browser Web Portal)
- For the moment, we store our application data in local JSON files inside the database folder:
  - database/users.json (stores user id, name, email, password, and role)
  - database/tickets.json (stores ticket id, title, description, category, priority, requester, assignedTo, status, and history)

//Part 2 - Configuring the API Gateway and Route Forwarding
- We use the API Gateway on port 3000 as the single entry point so all client connections pass through it.
- In gateway/gateway.js, we configure Express, enable CORS, parse JSON bodies, expose a health check on GET /, and mount our router under /api.
- In gateway/routes.js, we define the internal microservice URLs:
  - USER_SERVICE = http://localhost:3001
  - TICKET_SERVICE = http://localhost:3002
- We create a shared forwardRequest() helper using Axios to forward GET, POST, PUT, and DELETE requests to the target microservice and relay the response status and JSON back to the client.
- If a backend microservice is not running, the catch block handles the connection error and returns HTTP 500 with {"message": "Microservice connection error"} so the gateway does not crash.

//Part 3 - Starting the Servers
- Open three separate Command Prompt terminals in C:\Users\DARSHAN\WebAndNetwork\IT HELPDESK and start each service:
- node user-service/user.js
- node ticket-service/ticket.js
- node gateway/gateway.js
- You should see the services running on ports 3001 (User Service), 3002 (Ticket Service), and 3000 (API Gateway).

//Part 4 - Testing the API Gateway and Microservices with curl
- First, we check that the API Gateway is running on port 3000:
- curl.exe -i http://localhost:3000/

- Calling the backend directly on port 3001 or 3002 does not pass through the Gateway:
- curl.exe -i http://localhost:3001/users
- curl.exe -i http://localhost:3002/tickets

- Now we redirect all requests through the API Gateway using /api/...:
- List all users (passwords are stripped from the response):
- curl.exe -i http://localhost:3000/api/users

- Create a new user through the Gateway:
- curl.exe -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"name\":\"Priya Shah\",\"email\":\"priya@helpdesk.com\",\"password\":\"pass123\",\"role\":\"Employee\"}"

- Authenticate a user through the Gateway (/api/login):
- curl.exe -i -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\"email\":\"admin@helpdesk.com\",\"password\":\"admin123\"}"

- List all support tickets through the Gateway:
- curl.exe -i http://localhost:3000/api/tickets

- Create a new support ticket (automatically creates the first audit history entry):
- curl.exe -i -X POST http://localhost:3000/api/tickets -H "Content-Type: application/json" -d "{\"title\":\"VPN Connection Drops\",\"description\":\"VPN disconnects every 5 mins\",\"category\":\"Network\",\"priority\":\"High\",\"requester\":\"Darshan\"}"

- Assign a ticket to an IT Staff member (replace <TICKET_ID> with the created ticket ID):
- curl.exe -i -X PUT http://localhost:3000/api/tickets/<TICKET_ID>/assign -H "Content-Type: application/json" -d "{\"assignedTo\":\"darshan\",\"assignedToId\":\"1795016335227\"}"

- Update ticket status and append to the audit history:
- curl.exe -i -X PUT http://localhost:3000/api/tickets/<TICKET_ID>/status -H "Content-Type: application/json" -d "{\"status\":\"In Progress\"}"

- Delete a ticket and a user by ID:
- curl.exe -i -X DELETE http://localhost:3000/api/tickets/<TICKET_ID>
- curl.exe -i -X DELETE http://localhost:3000/api/users/<USER_ID>

//Part 5 - Testing Invalid Requests, Wrong Addresses, and Service Failure
- If you try to call the /api gateway prefix directly on port 3001 or 3002, it does not work (404 Not Found):
- curl.exe -i http://localhost:3001/api/users
- curl.exe -i http://localhost:3002/api/tickets

- We test with wrong addresses or non-existent IDs (404 Not Found):
- curl.exe -i http://localhost:3000/api/wrong
- curl.exe -i -X DELETE http://localhost:3000/api/users/999
- curl.exe -i -X DELETE http://localhost:3000/api/tickets/999

- We test validation errors (400 Bad Request, 401 Unauthorized, 409 Conflict):
- curl.exe -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test@helpdesk.com\",\"password\":\"1234\",\"role\":\"Manager\"}"
- curl.exe -i -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\"email\":\"admin@helpdesk.com\",\"password\":\"wrongpass\"}"
- curl.exe -i -X POST http://localhost:3000/api/tickets -H "Content-Type: application/json" -d "{\"title\":\"Printer Jam\",\"description\":\"Paper stuck\",\"category\":\"Hardware\",\"priority\":\"Urgent\",\"requester\":\"Darshan\"}"
- curl.exe -i -X PUT http://localhost:3000/api/tickets/<TICKET_ID>/status -H "Content-Type: application/json" -d "{\"status\":\"Archived\"}"

- We test fault tolerance by stopping ticket-service/ticket.js (port 3002) and calling the Gateway (returns 500 Microservice connection error):
- curl.exe -i http://localhost:3000/api/tickets

//Part 6 - Running the Browser Client
- Open client/index.html in a web browser while all three Node.js servers are running.
- Sign in using the default Admin account (admin@helpdesk.com / admin123) to test Dashboard KPIs, User Management, Ticket Creation, Assignment, Status Updates, and Search/Filtering.
