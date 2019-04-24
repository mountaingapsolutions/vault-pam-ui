# base image
FROM node:9.4.0

# create the folders
RUN mkdir -p /usr/src/dist

# bundle APP files
ADD dist /usr/src/dist

# set working directory
WORKDIR /usr/src/dist/

# add `/usr/src/app/node_modules/.bin` to $PATH
ENV PATH /usr/src/dist/node_modules/.bin:$PATH

RUN npm install pm2 -g
RUN npm install --production

# start app
CMD ["npm", "run", "startpm2prod"]
