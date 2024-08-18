# Use an official Node.js runtime as a parent image
FROM node:16-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN npm install

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run the app when the container launches
CMD ["node", "app.js"]