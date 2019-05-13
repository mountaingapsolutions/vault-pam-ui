#!/usr/bin/env bash

readonly APP_NAME=vault-pam-ui
readonly CURRENT_SCRIPT="$(basename -- ${BASH_SOURCE[0]})"
readonly CURRENT_DIRECTORY="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly ENV_VARS=(PAM_DATABASE
                  PAM_DATABASE_USER
                  PAM_DATABASE_PASSWORD
                  PAM_DATABASE_URL
                  PAM_DATABASE_PORT
                  VAULT_API_TOKEN
                  VAULT_DOMAIN
                  SMTP_SERVICE
                  SMTP_USER
                  SMTP_PASS)
# styles
NL=$'\n'
BOLD=$(tput bold)
NORMAL=$(tput sgr0)

print_raw() {
    printf "$*$NL"
}

show_grey () {
    echo -e $BOLD$(tput setaf 7) $@ $NORMAL
}

show_norm () {
    echo -e $BOLD$(tput setaf 15) $@ $NORMAL
}

show_info () {
    echo -e $BOLD$(tput setaf 2) $@ $NORMAL
}

show_warn () {
    echo -e $BOLD$(tput setaf 11) $@ $NORMAL
}

show_err ()  {
    echo -e $BOLD$(tput setaf 9) $@ $NORMAL
}

print_title() {
    print_raw $NL
    show_info "---- ${1:Title} ----"
}

# display the spinner 
spin()
{
    spinner="/|\\-/|\\-"
    while :
    do
        for i in `seq 0 7`
        do
            printf "\r[${spinner:$i:1}]"
            sleep .2
        done
    done
}

confirm() {
  while true; do
  read -r -n 1 -p "${1:-Continue?} [y/n]: " REPLY
      case $REPLY in
          [yY]) echo; return 0 ;;
          [nN]) echo; return 1 ;;
          *) show_err "Invalid nput"
      esac
  done
}

print_required_env() {
    show_warn "Required environment variables"
    for i in "${ENV_VARS[@]}"
    do
        show_warn "\t${i}"
    done
}

# check all env vars are in .env file
validate_env_file() {
    for i in "${ENV_VARS[@]}"
    do
        ENV_VAL=$(grep -w $i .env | cut -d '=' -f2)
        if [[ -z "${ENV_VAL}" ]]; then
            show_err "${i} not set in ${CURRENT_DIRECTORY}/.env"
            print_required_env
            exit 1
        fi
    done
    show_info "All required environment variables in ${CURRENT_DIRECTORY}/.env are present."
}

# detect .env file
check_env_file() {
    if [ -f "${CURRENT_DIRECTORY}/.env" ]; then
        confirm "${CURRENT_DIRECTORY}/.env file found! Do you want to process this file?" && return 0 || return 1
    fi
}

# accept a question(string) and assign it to a variable
ask() {
    if [[ -z "${!2}" ]]; then
        READ_ARGS="-p"
        if [ "${3}" = "--password" ]; then
            READ_ARGS="-s ${READ_ARGS}"
        fi
        read $READ_ARGS "${NL}${BOLD}$1${NORMAL}" $2
    fi
}

# database questions
questions_db() {
    print_title "Database"
    if $(confirm "Are you using an EXTERNAL postgresql database(RDS or any hosted database)?" && return 0 || return 1); then
        ask "Enter database host: " PAM_DATABASE_URL
        ask "Enter database port: " PAM_DATABASE_PORT
        ask "Enter database name: " PAM_DATABASE
        ask "Enter database user: " PAM_DATABASE_USER
        ask "Enter database password: " PAM_DATABASE_PASSWORD --password
    else
        print_raw $NL
        if [ -n "$WITH_BUILD" ]; then
            show_warn "We will now install and create a database."
            # setting the default internal database data
            ask "Enter database password: " PAM_DATABASE_PASSWORD --password
            INSTALL_DB=yes
            PAM_DATABASE_URL=postgres
            PAM_DATABASE_PORT=5432
            PAM_DATABASE=pam-db
            PAM_DATABASE_USER=hashi_vault_pam_db_user
         else
            show_err "Please run \"./install --build\" to install an internal database. The default image doesn't have any internal database or use and external database."
            exit 1
        fi

    fi
}

# PAM questions
questions_pam() {
    print_title "PAM UI"
    ask "Enter pam ui port (Default: 8080): " PORT
    if [[ -z "$PORT" ]]; then
        show_warn "No PORT entered. Using 8080"
        PORT=8080
    else
        # If userInput is not empty show what the user typed in and run ls -l
        show_warn "Using port $PORT"
    fi
    # default
    USE_HSTS=false
}

# Vault questions
questions_vault() {
    print_title "Vault"
    ask "Enter vault domain: " VAULT_DOMAIN
    ask "Enter vault token: " VAULT_API_TOKEN
}

# email questions
questions_email() {
    print_title "Email"
    ask "Enter email service(gmail for now): " SMTP_SERVICE
    ask "Enter email username: " SMTP_USER
    ask "Enter email password: " SMTP_PASS --password
}

# check if docker is running.
check_docker() {
    docker_state=$(docker info >/dev/null 2>&1)
    if [[ $? -ne 0 ]]; then
        show_err "Docker does not seem to be running, run it first and try again."
        exit 1
    fi
}

clean_docker() {
    show_info "Cleaning docker images and containers..."
    # stop running container if any
    OLD_CONTAINER="$(docker ps --all --quiet --filter=name="$APP_NAME")"
    if [ -n "$OLD_CONTAINER" ]; then
        show_warn "An existing $APP_NAME container is running. Stopping..."
        docker rm -f $OLD_CONTAINER
    fi
    OLD_DB_CONTAINER="$(docker ps --all --quiet --filter=name="${PAM_DATABASE}")"
    if [ -n "$OLD_DB_CONTAINER" ]; then
        show_warn "An existing ${PAM_DATABASE} container is running. Stopping..."
        docker rm -f $OLD_DB_CONTAINER
    fi
    # purge old images (app)
    docker images -a | grep "${APP_NAME}" | awk '{print $3}' | xargs docker rmi
}

# Run docker container
run_docker() {
    show_info "Building and Running docker images..."

    # set default dev env vars
    export COMPOSE_PROJECT_NAME=$APP_NAME
    export PORT=$PORT
    export USE_HSTS=$USE_HSTS

    # if not user .env set env vars based from the user input
    if [ -z "${USE_ENV}" ]
    then
        for ENV_KEY in "${ENV_VARS[@]}"
        do
            ENV_VAL="${!ENV_KEY}"
            export $ENV_KEY=$ENV_VAL
            DOCKER_RUN_ARGS="${DOCKER_RUN_ARGS}-e ${ENV_KEY}=${ENV_VAL} "
        done
    else
        DOCKER_RUN_ARGS="--env-file ./.env "
    fi

    if [ -n "$WITH_BUILD" ]; then
        # if install --build
        COMPOSE_FILE=docker-compose.yml
        if [ -n "${INSTALL_DB}" ]; then
            show_info "Preparing internal DB."
            export POSTGRES_PORT=$PAM_DATABASE_PORT
            export POSTGRES_DB=$PAM_DATABASE
            export POSTGRES_USER=$PAM_DATABASE_USER
            export POSTGRES_PASSWORD=$PAM_DATABASE_PASSWORD
            COMPOSE_FILE=docker-compose-with-db.yml
        fi
        docker-compose -f $COMPOSE_FILE up -d --build
    else
        APP_CONTAINER_NAME="mountaingapsolutions/${APP_NAME}"
        docker pull $APP_CONTAINER_NAME
        DOCKER_RUN_ARGS="${DOCKER_RUN_ARGS}-e PORT=$PORT -e USE_HSTS=$USE_HSTS "
        docker run --name $APP_NAME -itd -p $PORT:$PORT $DOCKER_RUN_ARGS --rm $APP_CONTAINER_NAME
    fi
}

# Show running container
finish() {
    CONTAINER="$(docker ps --all --quiet --filter=name="$APP_NAME")"
    if [ -n "$CONTAINER" ]; then
        show_info "$APP_NAME container is now running."
    fi
    print_raw $NL
}

# Main function
main() {
    show_info "--------------------------------------------------"
    show_info "---- Welcome to Vault PAM installation script ----"
    show_info "--------------------------------------------------"
    if [ "${1}" = "--build" ]; then
        WITH_BUILD=yes
        show_info "Building the images..."
    fi
    questions_pam
    if check_env_file
    then
        validate_env_file
        USE_ENV=true
    else
        questions_db
        questions_vault
        questions_email
    fi
    # start the spinner
    spin & SPIN_PID=$!
    # kill the spinner on any following signal, including our own exit.
    trap "kill -9 $SPIN_PID" `seq 0 15`
    check_docker
    clean_docker
    run_docker
    finish
    kill -9 $SPIN_PID
}

if [[ "$0" == "${BASH_SOURCE[0]}" ]]; then
    main "$@"
fi
