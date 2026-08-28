# Agni Messenger

Agni Messenger is a real-time messaging application designed for fast, secure, and reliable communication. It allows users to send messages, create groups, and interact seamlessly. This project is built using React.js for the frontend, Node.js and Express.js for the backend, MongoDB for data storage, and Socket.io for live updates.

## Features

- **User Registration and Authentication:** Register accounts and authenticate securely using modern session handling.
- **Real-time Messaging:** Send and receive instant messages powered by WebSockets.
- **Group Chats:** Create and manage multi-user group chats for teams and communities.
- **Multimedia Sharing:** Share text messages, images, documents, and videos within individual and group chats.
- **Notifications:** Receive alerts for incoming messages and room events.
- **User Profiles:** Customize user profiles with display pictures, bios, and status indicators.
- **Search Functionality:** Find users and channels directly via the global search bar.
- **Security and Privacy:** Enforce secure data transmission, message encryption, and token-based API access.

## Getting Started

Follow these steps to run the Agni Messenger application locally:

1. Clone the repository: `git clone https://github.com/your-username/agni-messenger.git`
2. Change into the project directory: `cd agni-messenger`
3. Set up the backend:
   - Install dependencies: `cd backend && npm install`
   - Configure the MongoDB connection string and environment variables in the `.env` file.
   - Start the backend server: `npm start`
4. Set up the frontend:
   - Install dependencies: `cd ../frontend && npm install`
   - Configure the backend API and WebSocket endpoints in the `.env` file.
   - Start the development server: `npm start`
5. Navigate to `http://localhost:3000` in your browser to access Agni Messenger.

## Technologies Used

- **React.js:** Frontend user interface framework.
- **Node.js & Express.js:** Backend runtime environment and RESTful API framework.
- **MongoDB:** NoSQL database for messages, channels, and user records.
- **Socket.io:** Bidirectional, low-latency event communication.

## Contributing

Contributions to Agni Messenger are welcome.

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature-name`.
3. Commit your changes: `git commit -m 'Add new feature'`.
4. Push to your branch: `git push origin feature/your-feature-name`.
5. Open a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).
