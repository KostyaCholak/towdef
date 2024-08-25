FROM oven/bun:1

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN bun install

# Copy the rest of the application code to the working directory
COPY . .
COPY ./types.ts ..

# Expose the port that the app runs on
EXPOSE 3001

# Define the command to run the application
CMD ["bun", "run", "dev"]
