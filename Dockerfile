# base image
FROM node:9.4.0

# set working directory
RUN mkdir /app
WORKDIR /app

# add `/usr/src/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install and cache app dependencies
# COPY package.json /usr/src/app/package.json
COPY package.json /app/package.json

COPY . /app/
RUN npm install
RUN npm install react-scripts@1.1.1 -g --silent

# start app
CMD ["forever", "start"]