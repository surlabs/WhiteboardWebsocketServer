# Whiteboard Websocket Server

This project is a WebSocket server designed for real-time interactions with the Whiteboard object plugin for ILIAS,developed by SURLABS with funding from the University of Freiburg.
This code is freely distributed under the terms of the GNU General Public License version 3 (GPL-3.0),
a copy of which is available at https://www.gnu.org/licenses/gpl-3.0.en.html. This license allows for the free use,
modification, and distribution of this software, ensuring it remains open-source and accessible to the community.

DISCLAIMER: The developers, contributors, and funding entities associated with this Project assume no responsibility for any damages or losses incurred from the use of this software. Users are encouraged to review the license agreements and comply with the terms and conditions set forth.

Community involvement is welcome. To report bugs, suggest improvements, or participate in discussions, please visit the Mantis system and search for ILIAS Plugins under the "Whiteboard" category at https://mantis.ilias.de.

This software has been built using Node.js, Express, and WebSocket.

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

1. Within the project directory of the websocket server project, run `npm start`.
2. The server will start, and you should see a message indicating that the server is running on a specific port (default is 5123).

The first time you run the server, a directory called "whiteboard-data" will be created. In this folder the persistence data will be stored.

You can edit the port used by modifying the index.js file and editing line 10 where the port is defined.

**We recommend deploying the server through an individual Linux screen to keep the process active in the background.**
For example:

> screen -S whiteboard

And then, perform steps 1 and 2 to start the server.

You can then use to return to the session where the server was started:

> screen -r whiteboard

## Accessing the Server

The path to your server that you must configure in the Whiteboard plugin will be your domain next to the port and you must configure it in this format:

> yourdomain.com:5123
