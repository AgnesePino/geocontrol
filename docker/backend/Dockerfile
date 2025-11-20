FROM node:latest

WORKDIR /app

# Move package.json and package-lock.json to the working directory
# The . context is set in the docker-compose.yml file to the root of the project
COPY package*.json ./

# Install dependencies
RUN npm install

# By copying package.json and package-lock.json first, we can leverage Docker's caching mechanism
# to avoid reinstalling dependencies unless these files change. Since the source code can change
# frequently, this helps speed up the build process.

# Copy the rest of the application code to the working directory
# The . context is set in the docker-compose.yml file to the root of the project
COPY . .

# Creating a non-root user to run the application
RUN addgroup --system nodejs
RUN adduser --system --ingroup nodejs nodejs

# Change ownership of the application files to the non-root user
RUN chown -R nodejs:nodejs /app

# Switch to the non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 5000

# We don't start the application here, as it will
# be started by the docker-compose file using the command 
# specified in the service definition.