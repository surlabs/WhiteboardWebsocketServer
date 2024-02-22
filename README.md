# Whiteboard Websocket Server

This project is a WebSocket server designed for real-time interactions, developed by Surlabs. It's built using Node.js, Express, and WebSocket.

## Prerequisites

Before you begin, ensure you have installed Node.js and npm on your machine. This project also requires SSL certificates to be set up for secure communication.

## Installation

To set up the project on your local machine, follow these steps:

1. Clone the repository to a directory on the server where the connection will be hosted.
2. Navigate to the project directory in your terminal.
3. Run `npm install` to install the required dependencies.
4. Copy the contents of your fullchain.pem and privkey.pem certificates to the /cert folder.

## Starting the Server

To start the server, follow these steps:

1. Within the project directory, run `npm start`.
2. The server will start, and you should see a message indicating that the server is running on a specific port (default is 5123).

The first time you run the server, a directory called "whiteboard-data" will be created. In this folder the persistence data will be stored.

## Accessing the Server

The path to your server that you must configure in the Whiteboard plugin will be your domain next to the port and you must configure it in this format:

> yourdomain.com:5123
