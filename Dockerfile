# Stage 1 - build the artifacts
FROM node:9.4.0 as build-stage

WORKDIR /app

COPY package.json /app/

RUN npm install --quiet

COPY ./ /app/

RUN npm run build

# Stage 2 - the actual app build
FROM mhart/alpine-node:latest

# create the folders
RUN mkdir -p /usr/src/dist

# copy the built artifacts
COPY --from=build-stage /app/dist /usr/src/dist

# set working directory
WORKDIR /usr/src/dist/

ENV PATH /usr/src/dist/node_modules/.bin:$PATH

RUN npm install --quiet --production

# start app
CMD ["npm", "run", "startpm2prod"]
