# base image
FROM mhart/alpine-node:latest

# create the folders
RUN mkdir -p /usr/src/dist

# bundle APP files
ADD dist /usr/src/dist

# set working directory
WORKDIR /usr/src/dist/

# add `/usr/src/app/node_modules/.bin` to $PATH
ENV PATH /usr/src/dist/node_modules/.bin:$PATH

RUN npm install --production

ARG WITH_DB
ARG PAM_DATABASE
ARG PAM_DATABASE_USER
ARG PAM_DATABASE_PASSWORD

RUN if [ "$WITH_DB" = "yes" ] ; then \
    echo "Preparing database ..."; \
    apk add postgresql; \
    mkdir -p /run/postgresql; \
    mkdir -p /var/lib/postgresql/data; \
    chmod a+w /run/postgresql; \
    chmod -R 777 /var/lib/postgresql/data; \
    chown postgres /run/postgresql; \
    chown postgres /var/lib/postgresql/data; \
    else echo "Skipping database preparation."; \
    fi

USER postgres

RUN if [ "$WITH_DB" = "yes" ] ; then \
    echo "Starting the database...${PAM_DATABASE} ${PAM_DATABASE_USER} ${PAM_DATABASE_PASSWORD}"; \
    initdb /var/lib/postgresql/data; \
    pg_ctl start -w -D /var/lib/postgresql/data -l /var/lib/postgresql/server.log; \
    createdb ${PAM_DATABASE}; \
    psql -c "CREATE USER ${PAM_DATABASE_USER} WITH PASSWORD '${PAM_DATABASE_PASSWORD}';"; \
    else echo "Skipping database start."; \
    fi

EXPOSE 5432

# start app
CMD ["npm", "run", "startpm2prod"]
