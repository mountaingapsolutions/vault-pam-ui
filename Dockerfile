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
ARG PAM_DATABASE_PORT
ARG PAM_DATABASE_USER
ARG PAM_DATABASE_PASSWORD


RUN if [ "${WITH_DB}" = "yes" ] ; then \
    su; \
    apk update; \
    apk add "libpq" "postgresql-client" "postgresql" "postgresql-contrib"; \
    (addgroup -S postgres && adduser -S postgres -G postgres || true); \
    mkdir -p /var/lib/postgresql/data; \
    mkdir -p /run/postgresql/; \
    chown -R postgres:postgres /run/postgresql/ ; \
    chmod -R 777 /var/lib/postgresql/data; \
    chown -R postgres:postgres /var/lib/postgresql/data; \
    else echo Skipping database preparation; \
    fi
USER postgres
RUN if [ "${WITH_DB}" = "yes" ] ; then \
    initdb /var/lib/postgresql/data; \
    echo "host    all             all             0.0.0.0/0            trust" >> /var/lib/postgresql/data/pg_hba.conf; \
    echo "port = ${PAM_DATABASE_PORT}" >> /var/lib/postgresql/data/postgresql.conf; \
    echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf; \
    echo "logging_collector = on" >> /var/lib/postgresql/data/postgresql.conf; \
    echo "log_destination = 'stderr'" >> /var/lib/postgresql/data/postgresql.conf; \
    echo "log_directory = 'log'" >> /var/lib/postgresql/data/postgresql.conf; \
    echo "log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'" >> /var/lib/postgresql/data/postgresql.conf; \
    pg_ctl start -w -D  /var/lib/postgresql/data -l /var/lib/postgresql/server.log; \
    psql -p ${PAM_DATABASE_PORT} -c "CREATE DATABASE \"${PAM_DATABASE}\";"; \
    psql -p ${PAM_DATABASE_PORT} -c "CREATE USER ${PAM_DATABASE_USER} WITH PASSWORD '${PAM_DATABASE_PASSWORD}';"; \
    psql -p ${PAM_DATABASE_PORT} -c "GRANT ALL PRIVILEGES ON DATABASE \"${PAM_DATABASE}\" to ${PAM_DATABASE_USER};"; \
    psql -p ${PAM_DATABASE_PORT} -c "SELECT * FROM pg_roles;"; \
    else echo Skipping database preparation; \
    fi

# start app
CMD ["npm", "run", "startpm2prod"]
