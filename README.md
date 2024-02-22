# Whiteboard Websocket Server

This project is a WebSocket server designed for real-time interactions, developed by Surlabs. It's built using Node.js, Express, and WebSocket.

## Prerequisites

Before you begin, ensure you have installed Node.js and npm on your machine. This project also requires SSL certificates to be set up for secure communication.

## Installation

To set up the project on your local machine, follow these steps:

1. Clone the project repository to your local machine.
2. Navigate to the project directory in your terminal.
3. Run `npm install` to install the required dependencies.
4. Copy the contents of your fullchain.pem and privkey.pem certificates to the /cert folder.

## Starting the Server

To start the server, follow these steps:

1. Within the project directory, run `npm start`.
2. The server will start, and you should see a message indicating that the server is running on a specific port (default is 5123).

## Accessing the Server

To access the server, you will need the domain you have chosen, the server path (if applicable), and the port number. The URL will follow this format:

> <YourDomain>:<Port>
